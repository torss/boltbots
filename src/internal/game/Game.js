import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import uuidv4 from 'uuid/v4'
// import pull from 'pull-stream'
// import Pushable from 'pull-pushable'
import Vue from 'vue'
import '../extensions/three'
import { assignNewVueObserver } from '../Dereactivate'
import { btileLoaderItemsCreate, TiSh } from '../btile'
import { LoaderControl, LoaderItemFont, LoaderItemGltf } from '../LoaderControl'
import { initTiTys, initTestGame, initPlayers, initPlayer } from './content'
import { Sfxf } from '../Sfxf'
import { ExplosionShader } from '../shaders'
import { createNetNodeSingleton } from '../net'
import { glos } from '../Glos'
import { Card } from './Card'
import { CardSlot } from './CardSlot'
import { cryptoAlgoKeySv, cryptoAlgoWorkSv } from './Crypto'
import * as base64js from 'base64-js'

const netTopic = 'boltbots-20191013'
// const netDirectProtocol = '/boltbots/1.0.0'
const pingDelay = 1000
const pingDelayGlobal = 5000
const timeoutThreshold = 10 * pingDelay
const reconnectThreshold = 600000 // 10min

const saveListenerEnabled = true
let saveListener

/**
 * Primary game managing instance.
 */
export class Game {
  constructor () {
    this.ready = false
    this.state = 'matchmaking' // matchmaking, lobby, playing, reconnecting
    this.isJoining = false
    this.match = undefined
    this.netNodeIdStr = ''
    this.discoveredPeerCount = 0
    this.playersOnlineCount = 0
    this.connectedPeers = []
    this.openMatches = []
    this.pnid = uuidv4() // Persistent (Personal/Player) Network ID
    this.netMatch = undefined
    this.password = undefined
    this.chatMessages = []
    this.newChatMessages = false
    this.turnTimer = new THREE.Clock(false)
    this.turnTimerHost = new THREE.Clock(false)
    this.netKeyHost = ''
    this.isHost = false
    this.reconnectData = undefined
    assignNewVueObserver(this)

    if (saveListener) window.removeEventListener('beforeunload', saveListener)
    if (saveListenerEnabled) {
      saveListener = () => this.storeReconnectData()
      window.addEventListener('beforeunload', saveListener)
    }

    this.netNode = undefined
    this.netTopics = {
      global: { topic: netTopic, subscribed: false },
      player: { topic: '', subscribed: false }, // playerSelf
      match: { topic: '', subscribed: false },
      host: { topic: '', subscribed: false }
    }
    this.playersOnline = {}
    this.lastPingGlobal = Date.now()
    this.lastPingHostCheck = Date.now()
    this.matchHistory = []
    this.matchHistoryLast = undefined
    this.cryptoKeySvPrivate = undefined
    this.cryptoKeySvPrivateEx = undefined
    this.cryptoKeySvPublicEx = undefined
    this.cryptoPnidMsg = undefined
    const reconnectData = JSON.parse(localStorage.getItem('reconnectData'))
    if (reconnectData && (Date.now() - reconnectData.time) < reconnectThreshold) {
      this.reconnectData = reconnectData
      const { pnid, netMatch, cryptoKeySvPrivateEx, cryptoKeySvPublicEx } = reconnectData
      this.pnid = pnid
      this.netMatch = netMatch
      this.cryptoKeySvPrivateEx = cryptoKeySvPrivateEx
      this.cryptoKeySvPublicEx = cryptoKeySvPublicEx
    }
    // this.peerInfoHost = undefined

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

  get netKey () { return this.netNodeIdStr }
  get matchUid () { return this.netMatch.matchUid }

  finishTankLoaderItem (loaderItem) {
    const gltf = loaderItem.gltf
    gltf.scene.traverseVisible(obj => {
      if (obj.isMesh) {
        // obj.material = material
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    this.models[loaderItem.name] = gltf.scene
  }

  async cryptoPnidMsgInit () {
    const cryptoPnid = { pnid: this.pnid, netKey: this.netKey }
    const cryptoPnidU8a = new TextEncoder('utf-8').encode(JSON.stringify(cryptoPnid))
    this.cryptoPnidMsg = {
      type: 'pnid-show',
      payload: cryptoPnid,
      signature: base64js.fromByteArray(new Uint8Array(await crypto.subtle.sign(cryptoAlgoWorkSv, this.cryptoKeySvPrivate, cryptoPnidU8a)))
    }
  }

  async asyncInit () {
    // Crypto
    if (this.cryptoKeySvPrivateEx !== undefined && this.cryptoKeySvPublicEx !== undefined) {
      this.cryptoKeySvPrivate = await crypto.subtle.importKey('jwk', this.cryptoKeySvPrivateEx, cryptoAlgoKeySv, false, ['sign'])
    } else {
      const cryptoKeySv = await crypto.subtle.generateKey(cryptoAlgoKeySv, true, ['sign', 'verify'])
      this.cryptoKeySvPrivate = cryptoKeySv.privateKey
      this.cryptoKeySvPrivateEx = await crypto.subtle.exportKey('jwk', this.cryptoKeySvPrivate)
      this.cryptoKeySvPublicEx = await crypto.subtle.exportKey('jwk', cryptoKeySv.publicKey)
    }

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
          value: new THREE.TextureLoader().load('statics/textures/explosion/explosion.png')
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

    const btileLoaderItems = btileLoaderItemsCreate()
    const tankLoaderItem = new LoaderItemGltf('statics/models/vehicle/TestTank.glb', 'Bot')
    const fontLoaderItems = [new LoaderItemFont('statics/fonts/3d/droid/droid_sans_bold.typeface.json', 'Default')]
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

      this.finishTankLoaderItem(tankLoaderItem)

      initTestGame(this)
      this.ready = true
      if (this.readyFunc) this.readyFunc(this)

      // Connect to network
      this.initNetNode()
      // - //
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

  // cardAllDone (bot) {
  //   this.progressTurn()
  // }

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

  async initNetNode () {
    const netNode = await createNetNodeSingleton()
    this.netNode = netNode

    // netNode.handle(netDirectProtocol, (protocol, conn) => {
    //   conn.getPeerInfo((error, peerInfo) => {
    //     if (error) {
    //       console.error('netDirectProtocol handle getPeerInfo error:', error)
    //       return
    //     }
    //     const pushable = Pushable()
    //     pull(pushable, conn)
    //     pull(conn, pull.drain((data) => this.netHandleDirect(data, pushable, peerInfo)))
    //   })
    // })

    netNode.on('peer:discovery', (connection) => {
      // console.log('Discovered a peer:', peerInfo.id.toB58String())
      ++this.discoveredPeerCount
    })

    netNode.connectionManager.on('peer:connect', (connection) => {
      // const idStr = peerInfo.id.toB58String()
      // console.log('Got connection to: ' + idStr)

      // peerInfo.idStr = peerInfo.id.toB58String()
      this.connectedPeers.push(connection.remotePeer)
    })

    netNode.connectionManager.on('peer:disconnect', (connection) => {
      let index = this.connectedPeers.indexOf(connection.remotePeer)
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

    await netNode.start()
    const idStr = netNode.peerId.toB58String()
    this.netNodeIdStr = idStr

    await this.cryptoPnidMsgInit()
    this.subscribeGlobal()
    this.subscribePlayerSelf()
    new TWEEN.Tween({}).to({}, 1).repeatDelay(pingDelay).repeat(Infinity).onRepeat(() => this.netUpdate()).start()
    if (this.reconnectData) this.startReconnect()
  }

  checkMatchmakingTimeouts (obj) {
    const now = Date.now()
    const toRemove = []
    let count = 0
    for (const [key, item] of Object.entries(obj)) {
      if (!item.lastPing) item.lastPing = now
      else if ((now - item.lastPing) > timeoutThreshold) {
        toRemove.push(key)
        continue
      }
      ++count
    }
    for (const key of toRemove) Vue.delete(obj, key)
    return count
  }

  netUpdate () {
    const { match } = this
    const now = Date.now()
    if ((now - this.lastPingGlobal) > pingDelayGlobal) {
      this.lastPingGlobal = now
      if (this.isHost && this.state === 'lobby') this.publishGlobal({ type: 'ping-global', matchUid: this.matchUid })
      else this.publishGlobal({ type: 'ping-global' })
    }
    if (this.state === 'matchmaking' || this.state === 'lobby') this.playersOnlineCount = this.checkMatchmakingTimeouts(this.playersOnline)
    if (this.state === 'matchmaking') this.checkMatchmakingTimeouts(this.openMatches)
    else if (this.state === 'lobby' || this.state === 'playing') {
      const { netMatch, turnTimerHost, pnid } = this
      const { playerSelf, players, gameOver, turn } = match

      const { endTurn, completeTurn } = playerSelf
      const playerHost = match.getPlayerByNetKey(this.netKeyHost)
      this.publishMatch({ type: 'ping-match', turn, endTurn, completeTurn, hostVote: playerHost === undefined || playerHost.lastPingTimeout || playerHost.left ? pnid : playerHost.pnid })

      if (gameOver) {
        for (const player of players) {
          player.endTurn = false
          player.completeTurn = false
        }
        return
      }

      for (const player of players) {
        if (player === playerSelf) player.lastPingTimeout = false
        else player.lastPingTimeout = (now - player.lastPing) > timeoutThreshold
      }
      if (this.isHost) {
        if (!match.turnInProgress && netMatch.endTurnTimeLimit > 0 && turnTimerHost.running && turnTimerHost.elapsedTime >= netMatch.endTurnTimeLimit) {
          console.log('turnTimerHost hostEndTurnPublish')
          this.hostEndTurnPublish()
        } else {
          for (const player of players) {
            if (player === playerSelf) continue // Superfluous
            if (player.lastPingTimeout) {
              // const endTurn = match.turnInProgress || !!player.bot.cardSlotsNext
              const completeTurn = playerSelf.completeTurn
              this.publishMatch({ type: 'timeout-player', playerId: player.id, completeTurn })
            }
          }
        }
      }
    }
  }

  storeReconnectData () { // NOTE This system obviously won't work well when mutltiple games are opened in the same browser.
    if (this.state !== 'playing') return
    const { matchUid, pnid, netKeyHost, match, netMatch, cryptoKeySvPublicEx, cryptoKeySvPrivateEx } = this
    if (match.gameOver) {
      this.clearReconnectData()
      return
    }
    if (!matchUid || !netKeyHost || !match.playerSelf) return
    localStorage.setItem('reconnectData', JSON.stringify({ time: Date.now(), matchUid, pnid, netKeyHost, netMatch, cryptoKeySvPublicEx, cryptoKeySvPrivateEx, matchData: match.serialize() }))
  }

  clearReconnectData () {
    this.reconnectData = undefined
    localStorage.removeItem('reconnectData')
    if (this.state === 'reconnecting') {
      this.state = 'matchmaking'
      this.subscribeGlobal()
      this.unsubscribeMatch()
      this.unsubscribeHost()
    }
  }

  startReconnect () {
    this.state = 'reconnecting'
    const { netKeyHost, matchUid, matchData } = this.reconnectData
    this.lastPingSelf = Date.now()
    this.netKeyHost = netKeyHost
    this.setMatchHistoryLast(matchData)

    this.unsubscribeGlobal()
    this.subscribeMatch(matchUid)
    this.unsubscribeHost()
    this.state = 'playing'
  }

  setMatchHistoryLast (matchHistoryLast) {
    this.match.placeBots()
    this.matchHistory = [matchHistoryLast]
    this.matchHistoryLast = matchHistoryLast
    this.deserializeMatch(matchHistoryLast)
    if (this.match.endTurn) {
      for (const player of this.match.players) player.endTurn = true
    }
    this.regenerateMap(false)
  }

  sendChatMessage (text) { if (this.match.playerSelf) this.publishMatch({ type: 'chat', text }) }

  subHandleHosting (msgFromHost, openMatch, data) {
    if (openMatch && !msgFromHost) return
    Vue.set(this.openMatches, data.matchUid, data)
  }

  // netHandleDirect (data, pushable, peerInfo) {
  //   peerInfo = this.getConnectedPeerByNetId(peerInfo.id.toB58String())
  //   // const sendBack = (data) => pushable.push(Buffer.from(JSON.stringify(data)))
  //   const dataStr = data
  //   data = JSON.parse(data)
  //   switch (data.type) {
  //     case 'hosting':
  //       this.subHandleHosting(data)
  //       break
  //     default:
  //       console.warn('netHandleDirect - Got unknown message - Content:', dataStr)
  //   }
  // }

  obtainOpenMatch (msg, data) {
    const { matchUid } = data
    let openMatch = this.openMatches[matchUid]
    const msgFromOpenMatchHost = openMatch && openMatch.netKeyHost === msg.from
    return { matchUid, openMatch, msgFromOpenMatchHost }
  }

  netHandleGlobal (msg) {
    const data = JSON.parse(msg.data)
    const { matchUid, openMatch, msgFromOpenMatchHost } = this.obtainOpenMatch(msg, data)
    const msgFromSelf = msg.from === this.netKey
    switch (data.type) {
      case 'ping-global': {
        const now = Date.now()
        this.lastPingSelf = now
        this.playersOnline[msg.from] = { lastPing: now }

        if (!msgFromSelf) {
          if (msgFromOpenMatchHost) openMatch.lastPing = now
          else this.publishHostOther(matchUid, { type: 'discover' })
        }
      } break
      case 'hosting':
        this.subHandleHosting(msgFromOpenMatchHost, openMatch, data)
        break
      case 'hosting-update':
        if (!msgFromOpenMatchHost) return
        if (data.playerCount > 0) openMatch.playerCount = data.playerCount
        else Vue.delete(this.openMatches, matchUid)
        break
      case 'transfer-host-global':
        if (!msgFromOpenMatchHost) return
        openMatch.playerName = data.newHostName
        openMatch.netKeyHost = data.netKeyHost
        --openMatch.playerCount
        if (openMatch.playerCount <= 0) Vue.delete(this.openMatches, matchUid) // Superfluous
        break
      case 'close-match':
        if (!msgFromOpenMatchHost) return
        if (this.netMatch !== openMatch) Vue.delete(this.openMatches, matchUid)
        break
      default:
        this.gotUnknownMessage('netHandleGlobal', msg)
    }
  }

  netHandleMatch (msg) {
    const { match } = this
    const { players, turnPlayers, playerSelf } = match
    const msgFromSelf = msg.from === this.netKey
    const msgFromHost = msg.from === this.netKeyHost
    const forClients = !this.isHost && msgFromHost
    const data = JSON.parse(msg.data)
    let player = match.getPlayerByNetKey(msg.from)
    if (this.state === 'reconnecting') player = undefined
    const sendBack = (data) => this.publishPlayerOther(msg.from, data)
    switch (data.type) {
      case 'ping-match':
        if (this.state === 'reconnecting') return
        if (!player) {
          sendBack({ type: 'pnid-request' })
          return
        }
        if (player.left) return
        this.lastPingSelf = Date.now()
        player.lastPing = Date.now()
        player.lastPingTimeout = false

        if (this.state !== 'lobby') {
          player.hostVote = data.hostVote
          const hostVotes = new Map()
          let requiredVoteCount = 0
          let totalVoteCount = 0
          for (const player of players) {
            if (!player.lastPingTimeout) ++requiredVoteCount
            if (match.getPlayerByPnid(player.hostVote) !== undefined) {
              hostVotes.set(player.hostVote, (hostVotes.get(player.hostVote) || 0) + 1)
              ++totalVoteCount
            }
          }
          if (hostVotes.size > 0 && totalVoteCount >= requiredVoteCount) {
            let pnidHostNew
            if (hostVotes.size === 1) {
              pnidHostNew = hostVotes.entries().next().value[0]
            } else {
              const hostVotePairs = Array.from(hostVotes.entries())
              hostVotePairs.sort((a, b) => a[1] - b[1])
              pnidHostNew = hostVotePairs[0][0]
            }
            const isSelf = pnidHostNew === this.pnid
            const netKeyHostNew = match.getPlayerByPnid(pnidHostNew).netKey
            if (this.netKeyHost !== netKeyHostNew) console.log('Game.netHandleMatch ping-match: New host with pnid ' + pnidHostNew + (isSelf ? ' (self)' : ' (other)'))
            else if (isSelf && !this.isHost) console.log('Game.netHandleMatch ping-match: Reinstating self as host with pnid ' + pnidHostNew)
            const becomingHost = isSelf && this.netKeyHost !== netKeyHostNew
            this.changeNetKeyHost(netKeyHostNew)
            if (becomingHost) this.publishMatch({ type: 'match-rectify', match: this.match.serialize() }) // NOTE Not sure if this is really useful / necessary
          } else if (this.isHost) {
            this.isHost = false // Host uncertainty
            console.log(`Game.netHandleMatch ping-match: Host uncertainty. hostVotes.size=${hostVotes.size} totalVoteCount=${totalVoteCount} requiredVoteCount=${requiredVoteCount}`)
          }

          if (!match.gameOver) {
            if (data.turn === match.turn && (match.endTurn === false || data.endTurn === match.endTurn)) {
              player.endTurn = data.endTurn
              player.completeTurn = data.completeTurn
            } else if (this.isHost && !msgFromSelf) {
              if (match.endTurn) {
                player.endTurn = true
              } else {
                player.endTurn = false
                player.completeTurn = false
              }
              sendBack({ type: 'match-rectify', match: this.match.serialize() })
              console.log(`Game.netHandleMatch ping-match: Send match-rectify to ${player.pnid} aka ${player.name}`)
            }
          }

          if (this.isHost && (Date.now() - this.lastPingHostCheck) > pingDelay) {
            this.lastPingHostCheck = Date.now()
            this.hostCheckTurnProgress()
          }
        }
        break
      case 'match-rectify':
        if (!msgFromHost || msgFromSelf) return
        this.setMatchHistoryLast(data.match)
        break
      case 'timeout-player': {
        if (!msgFromHost) return
        const player = match.getPlayerById(data.id)
        if (!player) return // Shouldn't happen
        player.endTurn = true // data.endTurn
        player.completeTurn = data.completeTurn
        this.hostCheckTurnProgress()
      } break
      case 'kick':
        if (!msgFromHost) return
        if (data.netKey === this.netKey) {
          if (!this.isHost) {
            --this.netMatch.playerCount
            this.leaveSub()
          }
        } else {
          this.removePlayerByNetKey(data.netKey)
          this.hostingUpdate()
        }
        break
      case 'chat':
        // if (!player) return
        const playerName = player ? player.name || '[NO PLAYER NAME]' : '[UNKNOWN PLAYER]'
        this.chatMessages.unshift({ playerName, text: data.text })
        if (!glos.rightDrawerOpen) this.newChatMessages = true
        break
      case 'other-player-joined':
        if (!forClients) return
        if (data.player.id === playerSelf.id) return
        initPlayer(this, data.player)
        match.placeBots()
        break
      case 'other-player-left':
        if (!msgFromHost) return
        if (data.netKey === this.netKey) return // Superfluous
        this.removePlayerByNetKey(data.netKey)
        this.hostingUpdate()
        break
      case 'transfer-host-match':
        if (!forClients) return
        this.removePlayerByNetKey(this.netKeyHost)
        this.netKeyHost = data.netKeyHost
        this.netMatch.netKeyHost = data.netKeyHost
        if (this.netKey === this.netKeyHost) this.becomeHost()
        break
      case 'leave-match':
        if (!player) return
        player.left = true
        player.endTurn = true
        player.completeTurn = true
        break
      case 'start-match':
        if (!msgFromHost) return
        match.handSize = this.netMatch.handSize
        match.checkpointCount = this.netMatch.checkpointCount
        match.slotCount = this.netMatch.slotCount
        match.placeBots()
        this.matchHistory = [match.serialize()]
        this.matchHistoryLast = this.matchHistory[0]
        this.deserializeMatch(this.matchHistory[0])
        // glos.cardSlots = playerSelf.bot.cardSlots
        // glos.hand = playerSelf.hand
        this.state = 'playing'
        break
      case 'end-turn-cosmetic': {
        if (!player) return
        if (data.turn < match.turn) return
        player.bot.object3d.add(this.sfxf.cpasEndTurn())
        player.endTurn = true
        const doneCount = turnPlayers.reduce((rv, player) => rv + (player.endTurn ? 1 : 0), 0)
        if (doneCount === 1 && this.netMatch.endTurnTimeLimit > 0) {
          this.turnTimer.start()
          if (this.isHost) this.turnTimerHost.start()
        }
      } break
      case 'start-turn':
        if (!msgFromHost) return
        this.turnTimer.stop()
        if (this.isHost) this.turnTimerHost.stop()
        this.matchHistory.push(data.matchData)
        this.matchHistoryLast = data.matchData
        this.deserializeMatch(data.matchData)
        this.startTurn()
        break
      case 'complete-turn-cosmetic':
        if (!player) return
        if (!match.turnInProgress) return
        if (data.turn < match.turn) return
        player.completeTurn = true
        break
      case 'complete-turn-all':
        if (!msgFromHost) return
        for (const player of players) {
          const newState = player.left
          player.endTurn = newState
          player.completeTurn = newState
        }
        match.endTurn = false
        match.turnInProgress = false
        this.matchHistoryLast = this.match.serialize()
        break
      default:
        this.gotUnknownMessage('netHandleMatch', msg)
    }
  }

  netHandleHost (msg) {
    const { match, matchUid } = this
    const { players, turnInProgress } = match
    const data = JSON.parse(msg.data)
    let player = match.getPlayerByNetKey(msg.from)
    const sendBack = (data) => this.publishPlayerOther(msg.from, data)
    // const sendBack = (data) => pushable.push(Buffer.from(JSON.stringify(data)))
    switch (data.type) {
      case 'discover':
        if (this.state !== 'lobby') return
        sendBack(this.netMatch) // Currently netMatch can be sent directly without filtering
        break
      case 'try-join':
        if (this.state !== 'lobby') {
          sendBack({ type: 'join-result', matchUid, cantJoinReason: 'match-closed' })
          return
        }
        if (this.password && data.password !== this.password) {
          sendBack({ type: 'join-result', matchUid, cantJoinReason: 'wrong-password' })
        } else {
          let playerName = data.playerName
          while (true) {
            const player = players.find(player => player.name === playerName)
            if (!player) break
            const smr = player.name.match(/(.*?)(\d*)$/)
            playerName = `${smr[1]}${smr[2] ? parseInt(smr[2]) + 1 : ' 2'}`
          }

          const { cryptoKeySvPublicEx } = data
          const player = initPlayer(this, playerName, cryptoKeySvPublicEx)
          player.netKey = msg.from
          player.pnid = data.pnid
          this.match.placeBots()
          // peerInfo.playerId = player.id
          sendBack({ type: 'join-result', matchUid, players: players.map(player => player.serialize(false)), playerSelfId: player.id })
          this.publishMatch({ type: 'other-player-joined', player: player.serialize(false), cryptoKeySvPublicEx })
          this.hostingUpdate()
        }
        break
      case 'leave':
        if (this.state !== 'lobby' || !player) return
        // const { playerId } = peerInfo
        // const player = match.removePlayerById(playerId)
        this.publishMatch({ type: 'other-player-left', netKey: player.netKey })
        break
      case 'end-turn-host':
        if (this.state !== 'playing' || !player || turnInProgress || data.turn < match.turn) return
        player.endTurn = true
        player.hand = data.hand.map(data => new Card().deserialize(data))
        player.bot.cardSlots = data.cardSlots.map(data => new CardSlot().deserialize(data))
        // player.bot.cardSlotsNext = data.cardSlots.map(data => new CardSlot().deserialize(data))
        this.hostEndTurn()
        break
      case 'complete-turn-host':
        if (this.state !== 'playing' || !player || !turnInProgress || data.turn < match.turn) return
        player.completeTurn = true
        this.hostCompleteTurn()
        break
      default:
        this.gotUnknownMessage('netHandleHost', msg)
    }
  }

  netHandlePlayerSelf (msg) {
    const { match } = this
    const data = JSON.parse(msg.data)
    const { openMatch, msgFromOpenMatchHost } = this.obtainOpenMatch(msg, data)
    const msgFromHost = msg.from === this.netKeyHost
    const msgFromSelf = msg.from === this.netKey
    const sendBack = (data) => this.publishPlayerOther(msg.from, data)
    switch (data.type) {
      case 'pnid-request':
        sendBack(this.cryptoPnidMsg)
        break
      case 'pnid-show':
        if (this.state !== 'playing') return
        const cryptoPnid = data.payload
        const cryptoPnidU8a = new TextEncoder('utf-8').encode(JSON.stringify(cryptoPnid))
        const playerClaim = match.getPlayerByPnid(cryptoPnid.pnid)
        if (playerClaim.cryptoKeySvPublic === undefined) return
        if (playerClaim === undefined) {
          console.warn(`Game.netHandlePlayerSelf pnid-show: Received invalid cryptoPnid.pnid='${cryptoPnid.pnid}', with cryptoPnid.netKey='${cryptoPnid.netKey}', msg.from='${msg.from}'`)
          return
        }
        const signature = base64js.toByteArray(data.signature)
        crypto.subtle.verify(cryptoAlgoWorkSv, playerClaim.cryptoKeySvPublic, signature, cryptoPnidU8a).then(valid => {
          if (!valid) {
            console.warn(`Game.netHandlePlayerSelf pnid-show: Received potential forgery, with invalid signature for cryptoPnid.netKey='${cryptoPnid.netKey}' and cryptoPnid.pnid='${cryptoPnid.pnid}'; msg.from='${msg.from}'`)
            return
          }
          if (cryptoPnid.netKey !== msg.from) {
            console.warn(`Game.netHandlePlayerSelf pnid-show: Received potential forgery, with msg.from='${msg.from}' but cryptoPnid.netKey='${cryptoPnid.netKey}' for cryptoPnid.pnid='${cryptoPnid.pnid}'`)
            return
          }
          playerClaim.netKey = cryptoPnid.netKey
          if (!msgFromSelf) console.log('Game.netHandlePlayerSelf pnid-show from other pnid: ' + playerClaim.pnid)
        })
        break
      case 'match-rectify':
        if (!msgFromHost) return
        console.log('Game.netHandlePlayerSelf match-rectify')
        this.setMatchHistoryLast(data.match)
        break
      case 'hosting':
        this.subHandleHosting(msgFromOpenMatchHost, openMatch, data)
        break
      case 'join-result':
        if (!msgFromOpenMatchHost || data.matchUid !== this.isJoining) return
        this.isJoining = false
        if (data.cantJoinReason) this.joinFailed('rejected', data.cantJoinReason)
        else this.joined(msg.from, this.openMatches[data.matchUid], data.players, data.playerSelfId)
        break
      default:
        this.gotUnknownMessage('netHandlePlayerSelf', msg)
    }
  }

  gotUnknownMessage (where, msg) {
    console.warn(where, '- Got unknown message from', msg.from, '- Content:', msg.data)
  }

  assembleTopic (topicKey, uid) {
    return `${netTopic}/${topicKey}/${uid}`
  }

  setTopicDirect (topicKey, topicNew = '', handler = undefined) {
    const netTopic = this.netTopics[topicKey]
    const update = (netTopic.topic !== topicNew) || handler
    if (netTopic.subscribed && update) {
      this.netNode.pubsub.unsubscribe(netTopic.topic)
      netTopic.subscribed = false
    }
    netTopic.topic = topicNew
    if (handler) {
      this.netNode.pubsub.on(netTopic.topic, handler)
      this.netNode.pubsub.subscribe(netTopic.topic)
      netTopic.subscribed = true
    }
  }

  setTopic (topicKey, uid = '', handler = undefined) {
    this.setTopicDirect(topicKey, this.assembleTopic(topicKey, uid), handler)
  }

  unsubscribeTopic (topicKey) {
    const netTopic = this.netTopics[topicKey]
    if (netTopic.subscribed) {
      this.netNode.pubsub.unsubscribe(netTopic.topic)
      netTopic.subscribed = false
    }
  }

  publishTopicDirect (topic, data) {
    if (topic) this.netNode.pubsub.publish(topic, Buffer.from(JSON.stringify(data)))
  }

  publishTopic (topicKey, data) {
    const { topic } = this.netTopics[topicKey]
    this.publishTopicDirect(topic, data)
  }

  subscribeGlobal () { this.setTopicDirect('global', netTopic, (msg) => this.netHandleGlobal(msg)) }
  unsubscribeGlobal () { this.unsubscribeTopic('global') }
  subscribePlayerSelf () { this.setTopic('player', this.netKey, (msg) => this.netHandlePlayerSelf(msg)) }
  subscribeMatch (matchUid) { this.setTopic('match', matchUid || this.matchUid, (msg) => this.netHandleMatch(msg)) }
  unsubscribeMatch () { this.unsubscribeTopic('match') }
  subscribeHost () { this.setTopic('host', this.matchUid, (msg) => this.netHandleHost(msg)) }
  unsubscribeHost () { this.unsubscribeTopic('host') }

  publishGlobal (data) { this.publishTopic('global', data) }
  publishMatch (data) { this.publishTopic('match', data) }
  publishHost (data) { this.publishTopic('host', data) }
  publishHostNew (uid, data) {
    this.setTopic('host', uid)
    this.publishHost(data)
  }
  publishHostOther (uid, data) { this.publishTopicDirect(this.assembleTopic('host', uid), data) }
  publishPlayerOther (uid, data) { this.publishTopicDirect(this.assembleTopic('player', uid), data) }

  deserializeMatch (matchData) {
    glos.threejsControls.autoRotate = false

    const { match } = this
    match.deserialize(matchData)
    match.enterBots()
    match.playerSelf = match.getPlayerByPnid(this.pnid)
    glos.adjustPlayerSelf()

    this.storeReconnectData()
  }

  removePlayerByNetKey (netKey) {
    const { match, state, netMatch } = this
    match.removePlayerByNetKey(netKey)
    if (state === 'lobby') match.placeBots()
    if (netMatch) netMatch.playerCount = match.players.length
  }

  host (netMatch) {
    const matchUid = this.netKey + '-' + uuidv4()

    const { match } = this
    match.destroyPlayers()
    match.playerSelf = initPlayer(this, netMatch.playerName, this.cryptoKeySvPublicEx)
    glos.adjustPlayerSelf()
    match.playerSelf.netKey = this.netKey
    match.playerSelf.pnid = this.pnid
    match.placeBots()

    this.password = netMatch.password
    netMatch.password = !!netMatch.password
    netMatch.playerCount = 1
    netMatch.matchUid = matchUid
    netMatch.netKeyHost = this.netKey
    netMatch.type = 'hosting' // Used so that netMatch can be published directly as a message
    Vue.set(this.openMatches, matchUid, netMatch)
    this.netMatch = netMatch
    this.becomeHost()
    this.publishGlobal(netMatch)
    this.state = 'lobby'
  }

  hostingUpdate (playerCount) {
    if (!this.isHost) return
    if (playerCount === undefined) playerCount = this.match.players.length
    const { matchUid } = this
    this.publishGlobal({ type: 'hosting-update', matchUid, playerCount })
  }

  becomeHost () {
    this.unsubscribeGlobal()
    this.subscribeMatch()
    this.subscribeHost()
    this.changeNetKeyHost(this.netKey)
  }

  changeNetKeyHost (netKeyHost) {
    this.netKeyHost = netKeyHost
    this.isHost = this.netKey === netKeyHost
    if (this.isHost) this.subscribeHost()
    else this.unsubscribeHost()
  }

  returnToLobby () {
    this.clearReconnectData()
    this.match.gameOver = false
    this.regenerateMap(true)
    this.matchHistoryLast = undefined
    this.matchHistory = []
    this.unsubscribeHost()
    this.leaveSub()
  }

  // NOTE Deprecated because pubsub can afaik theoretically work without direct connections, thus this should not be used since it might not always be available.
  // callPeer (peerInfo, data, func, funcError) {
  //   if (funcError === true) funcError = (error) => func(undefined, error)
  //   this.netNode.dialProtocol(peerInfo, netDirectProtocol, (error, conn) => {
  //     if (error) {
  //       if (funcError) funcError(error)
  //       else console.warn('callPeer (data.type=', data.type, ') unhandled error:', error)
  //       return
  //     }
  //     const pushable = Pushable()
  //     pull(pushable, conn)
  //     if (func) pull(conn, pull.drain(func))
  //     pushable.push(Buffer.from(JSON.stringify(data)))
  //   })
  // }

  tryJoin (matchUid, playerName, password) {
    // const peerInfo = this.getConnectedPeerByNetKey(netKey)
    // if (!peerInfo) return

    this.password = password

    const netMatch = this.openMatches[matchUid]
    if (netMatch.playerCount >= netMatch.maxPlayers) return
    if (!netMatch.password) password = undefined
    else if (!password) {
      this.joinFailed('empty-password')
      return
    }
    this.isJoining = matchUid
    this.isHost = false
    // this.netKeyHost = netKey
    // this.peerInfoHost = peerInfo

    const { pnid, cryptoKeySvPublicEx } = this
    this.publishHostNew(matchUid, { type: 'try-join', playerName, password, pnid, cryptoKeySvPublicEx })

    // this.callPeer(peerInfo, { type: 'join', playerName, password }, (data, error) => {
    //   this.isJoining = false
    //   if (error) {
    //     failed('network-error', error)
    //     return
    //   }
    //   data = JSON.parse(data)
    //   if (data.type !== 'join-result') {
    //     failed('protocol-error', data)
    //     return
    //   }
    //   if (data.cantJoinReason) failed('rejected', data.cantJoinReason)
    //   else this.joined(netMatch, data.players, data.playerSelfId)
    // }, true)
  }

  joinFailed (why, data) {
    glos.dialogData = { type: 'join-failure', why, data }
    this.isJoining = false
  }

  joined (netKeyHost, netMatch, players, playerSelfId) {
    if (!netMatch) return

    const { match } = this

    this.netKeyHost = netKeyHost
    this.state = 'lobby'
    this.netMatch = netMatch
    match.destroyPlayers()
    for (const playerData of players) initPlayer(this, playerData)
    match.playerSelf = match.getPlayerById(playerSelfId)
    glos.adjustPlayerSelf()
    this.regenerateMap()

    this.unsubscribeGlobal()
    this.subscribeMatch() // Join match topic
    // this.publishGlobal({ type: 'joined', matchUid }) // Notify matchmaking
  }

  leave () {
    if (this.state === 'playing') {
      this.publishMatch({ type: 'leave-match' })
    } else {
      const { netMatch } = this
      if (!netMatch) return
      if (this.isHost) {
        this.subscribeGlobal()
        this.unsubscribeHost()
        const player = this.match.players.find(player => player.netKey !== this.netKey)
        if (player) {
          const { matchUid } = netMatch
          this.publishGlobal({ type: 'transfer-host-global', matchUid, netKeyHost: player.netKey, newHostName: player.name })
          this.publishMatch({ type: 'transfer-host-match', netKeyHost: player.netKey })
        } else {
          this.hostingUpdate(0)
        }
      } else this.publishHost({ type: 'leave' })
    }
    this.leaveSub()
  }

  leaveSub () {
    this.netMatch = undefined
    this.unsubscribeHost()
    this.unsubscribeMatch()
    this.subscribeGlobal()
    this.isHost = false
    this.state = 'matchmaking'

    this.regenerateMap()
  }

  kick (player) {
    if (!this.isHost) return
    if (player === this.match.playerSelf) {
      this.leave()
      return
    }

    const { netMatch } = this
    if (!netMatch) return
    this.publishMatch({ type: 'kick', netKey: player.netKey })
    this.hostingUpdate()
  }

  startMatch () {
    if (this.state !== 'lobby') return
    const { netMatch } = this
    if (!netMatch) return
    this.publishGlobal({ type: 'close-match', matchUid: netMatch.matchUid })
    this.publishMatch({ type: 'start-match' })
  }

  endTurn () {
    if (this.state !== 'playing') return
    const { match } = this
    const { playerSelf, turn } = match
    if (playerSelf.endTurn) return
    // this.turnTimer.stop()
    playerSelf.endTurn = true
    const hand = playerSelf.hand.map(card => card.serialize())
    const cardSlots = playerSelf.bot.cardSlots.map(cardSlot => cardSlot.serialize())
    this.publishHost({ type: 'end-turn-host', turn, hand, cardSlots })
    this.publishMatch({ type: 'end-turn-cosmetic', turn })
  }

  startTurn () {
    for (const player of this.match.players) {
      player.endTurn = true
      player.completeTurn = false
    }
    this.match.startTurn()
  }

  completeTurn () {
    if (this.state !== 'playing') return
    const { match } = this
    const { playerSelf, turn } = match
    if (playerSelf.completeTurn) return
    playerSelf.completeTurn = true
    this.publishHost({ type: 'complete-turn-host', turn })
    this.publishMatch({ type: 'complete-turn-cosmetic', turn })
  }

  hostEndTurn () {
    const { match } = this
    if (this.state !== 'playing' || !this.isHost || match.turnInProgress) return false
    const allDone = this.match.turnPlayers.reduce((rv, player) => rv && (player.endTurn || player.lastPingTimeout), true)
    if (allDone) {
      match.endTurn = true
      this.hostEndTurnPublish()
      return true
    }
    return false
  }

  hostEndTurnPublish () {
    // for (const player of turnPlayers) player.bot.cardSlots = player.bot.cardSlotsNext
    this.publishMatch({ type: 'start-turn', matchData: this.match.serialize() })
  }

  hostCheckTurnProgress () {
    if (!this.isHost) return // Superfluous
    if (!this.hostCompleteTurn()) this.hostEndTurn()
  }

  hostCompleteTurn () {
    const { match } = this
    if (this.state !== 'playing' || !this.isHost || !match.turnInProgress) return false
    const allDone = match.turnPlayers.reduce((rv, player) => rv && (player.completeTurn || player.lastPingTimeout), true)
    if (allDone) {
      this.publishMatch({ type: 'complete-turn-all' }) // TODO maybe send match here too
      return true
    }
    return false
  }

  regenerateMap (recreatePlayers = true) {
    const game = this
    const { match, netMatch } = game
    if (game.state === 'matchmaking') {
      match.setRngSeedStr(glos.hostSeed)
      match.checkpointCount = glos.hostCheckpointCount
      match.turn = 1
    } else {
      match.checkpointCount = netMatch.checkpointCount
      match.handSize = netMatch.handSize
      match.slotCount = netMatch.slotCount
      match.setRngSeedStr(netMatch.seed)
    }
    match.regenerateMap()
    if (recreatePlayers) {
      if (game.state === 'matchmaking') game.recreatePlayers()
      else match.placeBots()
    }
  }

  recreatePlayers () {
    const game = this
    if (game.state !== 'matchmaking') return
    const { match } = game
    match.destroyPlayers()
    initPlayers(game, glos.hostMaxPlayers)
    match.playerSelf = match.players[0]
    match.placeBots()
  }
}
