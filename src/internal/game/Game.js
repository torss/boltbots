import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import pull from 'pull-stream'
import Pushable from 'pull-pushable'
import Vue from 'vue'
import '../extensions/three'
import { assignNewVueObserver } from '../Dereactivate'
import { btileLoaderItemsCreate, TiSh } from '../btile'
import { LoaderControl, LoaderItemFont, LoaderItemGltf } from '../LoaderControl'
import { initTiTys, initTestGame, initPlayers } from './content'
import { Sfxf } from '../Sfxf'
import { ExplosionShader } from '../shaders'
import { createNetNodeSingleton } from '../net'
import { glos } from '../Glos'
import { CardSlot } from './CardSlot'

const netTopic = 'boltbots-20190708'
const netDirectProtocol = '/boltbots/1.0.0'

/**
 * Primary game managing instance.
 */
export class Game {
  constructor () {
    this.ready = false
    this.state = 'matchmaking' // matchmaking, lobby, playing
    this.match = undefined
    this.netNodeIdStr = ''
    this.discoveredPeerCount = 0
    this.connectedPeers = []
    this.onlinePlayerPeers = []
    this.openMatches = {}
    this.netMatch = undefined
    this.password = undefined
    this.netTopicMatch = ''
    this.lobbyPeers = []
    this.pseudoPeer = {}
    this.playerName = ''
    this.chatMessages = []
    this.newChatMessages = false
    this.turnTimer = new THREE.Clock(false)
    assignNewVueObserver(this)

    this.netNode = undefined

    this.sfxf = new Sfxf(this)
    this.readyFunc = undefined
    this.tiTys = undefined
    this.models = {}
    this.materials = {}
    this.fonts = {}
    this.scene = undefined // THREE.Scene
    this.envMap = undefined // THREE
    this.audioListener = undefined // THREEE.AudioListener
    this.threeTest = undefined // THREE.* test data (envMap)
    this.explosionMaterial = undefined
    this.explosionGeometry = undefined
    this.clock = new THREE.Clock()
  }

  get hostKey () {
    return this.netNodeIdStr
  }

  asyncInit () {
    // Lazor Orb
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0.5, 0.25, 0),
      metalness: 0.99,
      roughness: 0.01,
      envMapIntensity: 1
    })
    this.models['lazor-orb'] = new THREE.Mesh(new THREE.SphereBufferGeometry(0.020, 32, 32), material)
    new TWEEN.Tween(material.emissive)
      .to(new THREE.Color(0.75, 0.5, 0.1), 750)
      .repeat(Infinity)
      .yoyo(true)
      .easing(TWEEN.Easing.Bounce.InOut)
      .start()
    // - //
    // Explosion material & geometry
    this.explosionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tExplosion: {
          type: 't',
          value: new THREE.TextureLoader().load('../statics/textures/explosion/explosion.png')
        },
        time: {
          type: 'f',
          value: 0.0
        }
      },
      vertexShader: ExplosionShader.vertexShader,
      fragmentShader: ExplosionShader.fragmentShader
    })
    this.explosionGeometry = new THREE.IcosahedronGeometry(20, 4)
    // - //
    // Map (TiMa) default material
    this.materials['MapDefault'] = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.90,
      roughness: 0.20,
      envMapIntensity: 1,
      vertexColors: THREE.VertexColors
    })
    // Hover material
    this.materials['Hover'] = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.10, 0.10, 1.0) })
    // - //
    // Connect to network
    this.initNetNode()
    // - //

    const btileLoaderItems = btileLoaderItemsCreate()
    const tankLoaderItem = new LoaderItemGltf('../statics/models/vehicle/TestTank.glb', 'Bot')
    const fontLoaderItems = [new LoaderItemFont('../statics/fonts/3d/droid/droid_sans_bold.typeface.json', 'Default')]
    const loaderItems = [...btileLoaderItems, tankLoaderItem, ...fontLoaderItems]
    const loaderControl = new LoaderControl(loaderItems, (success, loaderControl) => {
      if (!success) {
        console.error('loaderControl failed')
        return
      }

      for (const item of fontLoaderItems) this.fonts[item.name] = item.font

      const tiShs = {}
      for (const item of btileLoaderItems) {
        tiShs[item.name] = new TiSh(item.gltf.scene)
      }
      this.tiTys = initTiTys(tiShs)

      finishTankLoaderItem(tankLoaderItem, this)

      initTestGame(this)
      this.ready = true
      if (this.readyFunc) this.readyFunc(this)
    })
    loaderControl.start()

    // btileInit(({ tiShs }) => {
    //   this.tiTys = initTiTys(tiShs)
    //   initTestGame(this)
    //   this.ready = true
    // })
  }

  // nextTurn () {
  //   const match = this.match
  //   match.turnPlayerIndex = -1
  //   this.progressTurn()
  // }

  // /**
  //  * Progress within turn (next player)
  //  */
  // progressTurn () {
  //   const match = this.match
  //   ++match.turnPlayerIndex
  //   if (match.turnPlayer) {
  //     // match.turnPlayer.bot.object3d.position.z += 1
  //     match.turnPlayer.bot.cardStart()
  //   }
  // }

  cardAllDone (bot) {
    this.progressTurn()
  }

  preAnimateFunc () {
    this.explosionMaterial.uniforms[ 'time' ].value = this.clock.getElapsedTime()
  }

  createExplosionObj (size = 1) {
    const obj = new THREE.Mesh(
      this.explosionGeometry,
      this.explosionMaterial
    )
    obj.scale.setScalar(0.025 * size)
    obj.bloom = true
    return obj
  }

  createExplosion (funcMax, size = 1, duration = 750) {
    const sizeCur = { size: 0.01 }
    const obj = this.createExplosionObj(sizeCur.size)
    new TWEEN.Tween(sizeCur).to({ size }, duration)
      .onUpdate(() => {
        obj.scale.setScalar(0.025 * sizeCur.size)
      })
      .yoyo(true)
      .repeat(1)
      .easing(TWEEN.Easing.Quartic.InOut)
      .onComplete(() => obj.removeSelf())
      .onRepeat(funcMax || null)
      .start()
    this.scene.add(obj)
    return obj
  }

  initNetNode () {
    createNetNodeSingleton((err, netNode) => {
      if (err) return console.error('createNetNode failed, check if your browser has WebRTC Support', err)
      this.netNode = netNode

      netNode.handle(netDirectProtocol, (protocol, conn) => {
        conn.getPeerInfo((err, peerInfo) => {
          if (err) {
            console.error('netDirectProtocol handle getPeerInfo error:', err)
            return
          }
          const pushable = Pushable()
          pull(pushable, conn)
          pull(conn, pull.drain((data) => this.netHandleDirect(data, pushable, peerInfo)))
        })
      })

      netNode.on('peer:discovery', (peerInfo) => {
        // console.log('Discovered a peer:', peerInfo.id.toB58String())
        ++this.discoveredPeerCount
      })

      netNode.on('peer:connect', (peerInfo) => {
        // const idStr = peerInfo.id.toB58String()
        // console.log('Got connection to: ' + idStr)

        peerInfo.idStr = peerInfo.id.toB58String()
        this.connectedPeers.push(peerInfo)
      })

      netNode.on('peer:disconnect', (peerInfo) => {
        let index = this.connectedPeers.indexOf(peerInfo)
        if (index >= 0) {
          this.connectedPeers.splice(index, 1)
        } else {
          // const idStr = peerInfo.id.toB58String()
          // console.warn('Tried to remove non-existant peer:', idStr)
        }

        // peerInfo.disconnected = true
        // if (this.state === 'lobby' && this.pseudoPeer.isHost && this.lobbyPeers.includes(peerInfo)) {
        //   this.kick(peerInfo)
        // }
        // index = this.lobbyPeers.indexOf(peerInfo)
        // if (index >= 0) {
        //   const peerInfo = this.lobbyPeers[index]
        //   this.lobbyPeers.splice(index, 1)
        //   peerInfo.disconnected = true
        // }
      })

      netNode.once('peer:connect', (peerInfo) => {
        const updateOnlinePlayerPeers = () => {
          netNode.pubsub.peers(netTopic, (error, peers) => {
            if (error) console.warn('updateOnlinePlayerPeers failed:', error)
            else {
              this.onlinePlayerPeers = peers

              for (const peerIdStr of this.onlinePlayerPeers) {
                const peerInfo = this.getConnectedPeerByNetId(peerIdStr)
                if (peerInfo === undefined || peerInfo.isOnlinePlayer) continue
                peerInfo.isOnlinePlayer = true

                // Send current host data
                if (this.pseudoPeer.isHost) {
                  const { playerName, matchName, password, maxPlayers, seed, playerCount, hostKey } = this.netMatch
                  this.callPeer(peerInfo, { type: 'hosting', playerName, matchName, password, maxPlayers, seed, playerCount, hostKey })
                }
              }
            }
          })
          this.matchCheckConnected()
        }
        netNode.pubsub.subscribe(netTopic, (msg) => {
          // console.log(msg.from, msg.data.toString())
          updateOnlinePlayerPeers()
          this.netHandleMsg(msg)
        })
        new TWEEN.Tween({}).to({}, 1000).repeat(Infinity).onRepeat(updateOnlinePlayerPeers).start()
      })

      netNode.start((err) => {
        if (err) return console.error('netNode.start failed:', err)
        const idStr = netNode.peerInfo.id.toB58String()
        this.netNodeIdStr = idStr
        this.pseudoPeer = { idStr, hostKey: idStr }
      })
    })
  }

  getConnectedPeerByNetId (key) {
    if (key === this.netNodeIdStr) return this.pseudoPeer
    const peerInfo = this.connectedPeers.find(peerInfo => peerInfo.idStr === key)
    return peerInfo
  }

  getConnectedPeerByHostKey (key) {
    if (key === this.hostKey) return this.pseudoPeer
    const peerInfo = this.connectedPeers.find(peerInfo => peerInfo.hostKey === key)
    return peerInfo
  }

  netPublish (data) {
    this.netNode.pubsub.publish(netTopic, Buffer.from(JSON.stringify(data)))
  }

  netPublishMatch (data) {
    if (this.netTopicMatch) this.netNode.pubsub.publish(this.netTopicMatch, Buffer.from(JSON.stringify(data)))
  }

  sendChatMessage (text) {
    this.netPublishMatch({ type: 'chat', text })
  }

  netHandleDirect (data, pushable, peerInfo) {
    peerInfo = this.getConnectedPeerByNetId(peerInfo.id.toB58String())
    const sendBack = (data) => pushable.push(Buffer.from(JSON.stringify(data)))
    data = JSON.parse(data)
    switch (data.type) {
      case 'hosting':
        this.netHandleHosting(peerInfo, data)
        break
      case 'password-check': {
        const correct = data.password === this.password
        sendBack({ type: 'password-result', correct })
      } break
      case 'lobby-join':
        this.netHandleJoinSub(data, peerInfo)
        break
      default:
        console.warn('netHandleDirect - Got unknown message - Content:', data.toString())
    }
  }

  sortLobbyPeers () {
    this.lobbyPeers.sort((a, b) => {
      if (a === b) return 0
      if (a.isHost || b.isHost) return a.isHost ? -1 : 1
      if (a.playerName === b.playerName) return a.hostKey.localeCompare(b.hostKey)
      return a.playerName.localeCompare(b.playerName)
    })
  }

  netHandleJoinSub (data, peerInfo) {
    if (!this.lobbyPeers.includes(peerInfo)) {
      const openMatch = this.openMatches[data.hostKey]
      peerInfo.hostKey = data.hostKeyPeer
      peerInfo.playerName = data.playerName
      peerInfo.isHost = peerInfo.hostKey === openMatch.hostKey
      peerInfo.isSelf = peerInfo.hostKey === this.hostKey
      this.lobbyPeers.push(peerInfo)
      this.sortLobbyPeers()
      if (!peerInfo.isSelf) {
        const sendData = { type: 'lobby-join', playerName: this.playerName, hostKey: openMatch.hostKey, hostKeyPeer: this.pseudoPeer.hostKey }
        this.callPeer(peerInfo, sendData)
        this.recreatePlayers()
      } else {
        this.regenerateMap()
      }
    }
  }

  netHandleHosting (peerInfo, data) {
    if (this.openMatches[data.hostKey]) return
    if (peerInfo) peerInfo.hostKey = data.hostKey
    Vue.set(this.openMatches, data.hostKey, data)
  }

  netHandleJoin (msg, data) {
    // TODO proper security
    const openMatch = this.openMatches[data.hostKey]
    if (openMatch) {
      ++openMatch.playerCount
      if (this.netMatch === openMatch) {
        const peerInfo = this.getConnectedPeerByNetId(msg.from)
        this.netHandleJoinSub(data, peerInfo)
      }
    }
  }

  netHandleMsg (msg) {
    const data = JSON.parse(msg.data)
    switch (data.type) {
      case 'hosting': {
        const peerInfo = this.getConnectedPeerByNetId(msg.from)
        this.netHandleHosting(peerInfo, data)
      } break
      case 'join':
        this.netHandleJoin(msg, data)
        break
      case 'transfer-host': {
        // TODO proper security
        const openMatch = this.openMatches[data.hostKey]
        if (openMatch) {
          Vue.delete(this.openMatches, openMatch.hostKey)
          openMatch.playerName = data.playerName
          openMatch.hostKey = data.hostKeyNew
          Vue.set(this.openMatches, openMatch.hostKey, openMatch)
          if (this.netMatch === openMatch) {
            this.subscribeNetTopicMatch(openMatch.hostKey)
            const newHost = this.lobbyPeers.find(peerInfo => peerInfo.idStr === msg.from)
            if (newHost.hostKey === data.hostKeyNew) {
              newHost.isHost = true
            } else {
              console.warn('Security - netHandleMsg - transfer-host trickery: newHost.hostKey !== data.hostKeyNew', newHost.hostKey, data.hostKeyNew)
            }
          }
        }
      } break
      case 'leave': {
        const openMatch = this.openMatches[data.hostKey]
        if (openMatch) {
          --openMatch.playerCount
          if (this.netMatch === openMatch) {
            const peerInfo = this.getConnectedPeerByNetId(msg.from)
            const leaveKey = peerInfo.isHost ? data.hostKeyPeer : msg.from
            const index = this.lobbyPeers.findIndex(peerInfo => peerInfo.idStr === leaveKey)
            if (index >= 0) {
              const lobbyPeer = this.lobbyPeers[index]
              if (lobbyPeer.isSelf) {
                this.leaveSub()
              } else {
                this.lobbyPeers.splice(index, 1)
                this.recreatePlayers()
                if (lobbyPeer.isHost && this.lobbyPeers.length > 0) {
                  // Transfer host
                  const newHost = this.lobbyPeers[0]
                  if (newHost.isSelf) {
                    this.netPublish({
                      type: 'transfer-host',
                      hostKey: data.hostKey,
                      hostKeyNew: newHost.hostKey,
                      playerName: newHost.playerName
                    })
                  }
                }
                this.sortLobbyPeers()
              }
            }
          }
          if (openMatch.playerCount <= 0) Vue.delete(this.openMatches, data.hostKey)
        }
      } break
      default:
        console.warn('netHandleMsg - Got unknown message from', msg.from, '- Content:', msg.data.toString())
    }
  }

  netHandleMsgMatch (msg) {
    if (!msg.topicIDs.includes(this.netTopicMatch)) return
    const data = JSON.parse(msg.data)
    switch (data.type) {
      case 'chat': {
        const peerInfo = this.getConnectedPeerByNetId(msg.from)
        const playerName = peerInfo ? peerInfo.playerName : '[UNKNOWN PEER]'
        this.chatMessages.unshift({ playerName, text: data.text })
        if (!glos.rightDrawerOpen) this.newChatMessages = true
      } break
      case 'start': {
        this.regenerateMap()
        const playerSelf = this.match.playerSelf
        glos.cardSlots = playerSelf.bot.cardSlots
        glos.hand = playerSelf.hand
        this.state = 'playing'
      } break
      case 'endTurn': {
        for (const peerInfo of this.lobbyPeers) {
          if (peerInfo.disconnected) peerInfo.player.bot.explode(peerInfo.player) // NOTE This isn't fully safe since the time that different clients detect the disconnect COULD vary enough for this to not work
        }
        this.lobbyPeers = this.lobbyPeers.filter(peerInfo => !peerInfo.disconnected)

        const peerInfo = this.getConnectedPeerByNetId(msg.from)
        if (peerInfo.disconnected) return // This probably isn't possible anyway
        peerInfo.endTurn = true
        const cardSlotsNext = data.cardSlots.map(data => new CardSlot().deserialize(data))
        const player = peerInfo.player
        player.bot.cardSlotsNext = cardSlotsNext
        player.endTurn = true
        player.bot.object3d.add(this.sfxf.cpasEndTurn())
        const { match } = this
        const { turnPlayers } = match
        const doneCount = turnPlayers.reduce((rv, player) => rv + (player.endTurn ? 1 : 0), 0)
        if (doneCount === 1 && this.netMatch.endTurnTimeLimit > 0) this.turnTimer.start()
        const allDone = doneCount === turnPlayers.length
        if (allDone) {
          this.turnTimer.stop()
          for (const player of turnPlayers) {
            player.bot.cardSlots = player.bot.cardSlotsNext
            if (player.peerInfo.isSelf) glos.cardSlots = player.bot.cardSlots
          }

          this.match.startTurn()
          for (const peerInfo of this.lobbyPeers) peerInfo.endTurn = false
          for (const player of this.match.players) player.endTurn = false
        }
      } break
      case 'completeTurn': {
        const peerInfo = this.getConnectedPeerByNetId(msg.from)
        peerInfo.completeTurn = true
        const player = peerInfo.player
        player.completeTurn = true
        const { match } = this
        const { turnPlayers } = match
        const allDone = turnPlayers.reduce((rv, player) => rv && player.completeTurn, true)
        if (allDone) {
          for (const peerInfo of this.lobbyPeers) peerInfo.completeTurn = false
          for (const player of this.match.players) player.completeTurn = false

          match.turnInProgress = false
        }
      } break
      default:
        console.warn('netHandleMsgMatch - Got unknown message from', msg.from, '- Content:', msg.data.toString())
    }
  }

  matchCheckConnected () {
    const netTopicMatch = this.netTopicMatch
    if (!netTopicMatch) return
    this.netNode.pubsub.peers(netTopicMatch, (error, peers) => {
      if (error) console.warn('matchCheckConnected failed:', error)
      else {
        if (netTopicMatch !== this.netTopicMatch) return
        for (const peerInfo of this.lobbyPeers) {
          peerInfo.connected = 'checking'
          if (peerInfo.isSelf) peerInfo.connected = true
        }
        for (const peerIdStr of peers) {
          const peerInfo = this.getConnectedPeerByNetId(peerIdStr)
          if (peerInfo === undefined) continue
          peerInfo.connected = true
        }
        // let disconnectedCount = 0
        for (const peerInfo of this.lobbyPeers) {
          if (peerInfo.connected === 'checking') {
            peerInfo.connected = false
            this.kick(peerInfo)
            // ++disconnectedCount
          }
        }
        // if (disconnectedCount > 0) this.lobbyPeers = this.lobbyPeers.filter(peerInfo => !!peerInfo.connected)
      }
    })
  }

  subscribeNetTopicMatch (hostKey) {
    if (this.netTopicMatch) this.netNode.pubsub.unsubscribe(this.netTopicMatch)
    if (!hostKey) {
      this.netTopicMatch = ''
      return
    }
    this.netTopicMatch = netTopic + '-match-' + hostKey
    this.netNode.pubsub.subscribe(this.netTopicMatch, (msg) => this.netHandleMsgMatch(msg))
  }

  host (netMatch, playerName) {
    this.playerName = playerName
    this.subscribeNetTopicMatch(this.hostKey)

    this.password = netMatch.password
    netMatch.password = !!netMatch.password
    netMatch.playerCount = 0
    netMatch.hostKey = this.hostKey
    netMatch.type = 'hosting'
    Vue.set(this.openMatches, netMatch.hostKey, netMatch)
    this.netMatch = netMatch
    this.netPublish(netMatch)

    this.join(netMatch.hostKey, playerName) // this.state = 'lobby'
  }

  callPeer (peerInfo, data, func, funcErr) {
    this.netNode.dialProtocol(peerInfo, netDirectProtocol, (err, conn) => {
      if (err) {
        console.log('sendToPeer (data.type=', data.type, ') error:', err)
        if (funcErr) funcErr(err)
        return
      }
      const pushable = Pushable()
      pull(pushable, conn)
      if (func) pull(conn, pull.drain(func))
      pushable.push(Buffer.from(JSON.stringify(data)))
    })
  }

  tryJoin (hostKey, playerName, password) {
    this.playerName = playerName
    const peerInfo = this.getConnectedPeerByHostKey(hostKey)
    if (!peerInfo) return

    const netMatch = this.openMatches[hostKey]
    if (netMatch.playerCount >= netMatch.maxPlayers) return
    if (netMatch.password) {
      if (!password) {
        glos.wrongPassword = true
        return
      }
      this.callPeer(peerInfo, { type: 'password-check', password }, (data) => {
        data = JSON.parse(data)
        if (data.type !== 'password-result') {
          console.warn('tryJoin dialProtocol result type error:', data.type)
          return
        }
        if (data.correct) this.join(hostKey, playerName)
        else glos.wrongPassword = true
      })
    } else {
      this.join(hostKey, playerName)
    }
  }

  join (hostKey, playerName) {
    this.subscribeNetTopicMatch(hostKey)

    const netMatch = this.openMatches[hostKey]
    this.netMatch = netMatch
    this.netPublish({
      type: 'join',
      hostKey,
      hostKeyPeer: this.hostKey,
      playerName
    })

    this.state = 'lobby'
    this.lobbyPeers = [this.pseudoPeer]
    this.recreatePlayers()
  }

  leaveSub () {
    this.netMatch = undefined
    this.lobbyPeers = []
    this.subscribeNetTopicMatch(false)
    this.state = 'matchmaking'

    this.regenerateMap()
  }

  leave () {
    const { netMatch } = this
    if (!netMatch) return
    this.netPublish({
      type: 'leave',
      hostKey: netMatch.hostKey,
      hostKeyPeer: this.hostKey
    })
    this.leaveSub()
  }

  kick (peerInfo) {
    if (!this.pseudoPeer.isHost) return
    if (peerInfo.isSelf) {
      this.leave()
      return
    }

    const { netMatch } = this
    if (!netMatch) return
    this.netPublish({
      type: 'leave',
      hostKey: netMatch.hostKey,
      hostKeyPeer: peerInfo.hostKey
    })
  }

  startMatch () {
    if (!this.netMatch) return
    this.netPublishMatch({ type: 'start' })
  }

  endTurn () {
    if (this.state !== 'playing') return
    const { match } = this
    const { playerSelf } = match
    if (playerSelf.endTurn) return
    playerSelf.endTurn = true
    this.netPublishMatch({ type: 'endTurn', cardSlots: playerSelf.bot.cardSlots.map(cardSlot => cardSlot.serialize()) })
  }

  completeTurn () {
    if (this.state !== 'playing') return
    const { match } = this
    const { playerSelf } = match
    if (playerSelf.completeTurn) return
    playerSelf.completeTurn = true
    this.netPublishMatch({ type: 'completeTurn' })
  }

  recreatePlayers (placeBots = true) {
    const game = this
    const { match } = game
    for (const peerInfo of this.lobbyPeers) peerInfo.player = undefined
    match.destroyPlayers()
    if (game.state === 'matchmaking') initPlayers(game, glos.hostMaxPlayers)
    else initPlayers(game, undefined, game.lobbyPeers)
    if (placeBots) match.placeBots()
  }

  regenerateMap (recreatePlayers = true) {
    const game = this
    const { match } = game
    if (game.state === 'matchmaking') match.setRngSeedStr(glos.hostSeed)
    else match.setRngSeedStr(game.netMatch.seed)
    match.regenerateMap(false)
    if (recreatePlayers) game.recreatePlayers(true)
  }
}

function finishTankLoaderItem (loaderItem, game) {
  const gltf = loaderItem.gltf
  gltf.scene.traverseVisible(obj => {
    if (obj.isMesh) {
      // obj.material = material
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
  game.models[loaderItem.name] = gltf.scene
}
