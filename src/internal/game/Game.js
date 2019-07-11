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

const netTopic = 'boltbots-20190711'
// const netDirectProtocol = '/boltbots/1.0.0'
const pingDelay = 5000
const timeoutThreshold = 2 * pingDelay
const reconnectThreshold = 600000 // 10min

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
    saveListener = () => this.storeReconnectData()
    window.addEventListener('beforeunload', saveListener)

    this.netNode = undefined
    this.netTopics = {
      global: { topic: netTopic, subscribed: false },
      player: { topic: '', subscribed: false }, // playerSelf
      match: { topic: '', subscribed: false },
      host: { topic: '', subscribed: false }
    }
    this.playersOnline = {}
    this.lastPingHostCheck = Date.now()
    this.matchHistory = []
    this.matchHistoryLast = undefined
    // this.election = undefined
    const reconnectData = JSON.parse(localStorage.getItem('reconnectData'))
    if (reconnectData && (Date.now() - reconnectData.time) < reconnectThreshold) this.reconnectData = reconnectData
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
    // Connect to network
    this.initNetNode()
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

  initNetNode () {
    createNetNodeSingleton((error, netNode) => {
      if (error) return console.error('createNetNode failed, check if your browser has WebRTC Support', error)
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
        this.subscribeGlobal()
        this.subscribePlayerSelf()
        new TWEEN.Tween({}).to({}, 1).repeatDelay(pingDelay).repeat(Infinity).onRepeat(() => this.netUpdate()).start()
        if (this.reconnectData) this.startReconnect()
      })

      netNode.start((error) => {
        if (error) return console.error('netNode.start failed:', error)
        const idStr = netNode.peerInfo.id.toB58String()
        this.netNodeIdStr = idStr
      })
    })
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
    if (this.state === 'reconnecting') {
      this.requestReconnect()
      return
    }
    if (this.state !== 'matchmaking' && (Date.now() - this.lastPingSelf) > timeoutThreshold) {
      this.startReconnect()
      return
    }
    if (this.isHost) this.publishGlobal({ type: 'ping-global', matchUid: this.matchUid })
    else this.publishGlobal({ type: 'ping-global' })
    if (this.state === 'matchmaking' || this.state === 'lobby') this.playersOnlineCount = this.checkMatchmakingTimeouts(this.playersOnline)
    if (this.state === 'matchmaking') this.checkMatchmakingTimeouts(this.openMatches)
    else if (this.state === 'lobby' || this.state === 'playing') {
      const { netMatch, turnTimerHost } = this
      const { playerSelf, players, gameOver, turn } = match

      const { endTurn, completeTurn } = playerSelf
      this.publishMatch({ type: 'ping-match', turn, endTurn, completeTurn })

      if (gameOver) return

      const now = Date.now()
      for (const player of players) {
        if (player === playerSelf) player.lastPingTimeout = false
        else {
          player.lastPingTimeout = (now - player.lastPing) > timeoutThreshold
          if (player.lastPingTimeout) player.hostCandidates = undefined
        }
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
      } else {
        const { netKeyHost } = this
        const player = match.getPlayerByNetKey(netKeyHost)
        if (!player || (now - player.lastPing) > timeoutThreshold) {
          const hostCandidates = players.filter(player => !player.lastPingTimeout).map(player => player.netKey)
          this.match.playerSelf.hostCandidates = hostCandidates
          this.publishMatch({ type: 'host-seems-dead', hostCandidates })
        }
      }
    }
  }

  storeReconnectData () { // NOTE This system obviously won't work well when mutltiple games are opened in the same browser.
    if (this.state !== 'playing') return
    const { matchUid, netKeyHost, match, netMatch } = this
    if (match.gameOver) this.clearReconnectData()
    if (!matchUid || !netKeyHost || !match.playerSelf) return
    localStorage.setItem('reconnectData', JSON.stringify({ time: Date.now(), matchUid, netKeyHost, netKey: this.netKey, matchName: netMatch.matchName }))
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
    this.lastPingSelf = Date.now()
    const { netKeyHost, matchUid } = this.reconnectData
    this.netKeyHost = netKeyHost
    this.unsubscribeGlobal()
    this.subscribeMatch(matchUid)
    this.unsubscribeHost()
    this.requestReconnect()
  }

  requestReconnect () {
    const { matchUid, netKey } = this.reconnectData
    this.publishHostNew(matchUid, { type: 'reconnect-request', netKey })
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

  obainOpenMatch (msg, data) {
    const { matchUid } = data
    let openMatch = this.openMatches[matchUid]
    const msgFromHost = openMatch && openMatch.netKeyHost === msg.from
    return { matchUid, openMatch, msgFromHost }
  }

  netHandleGlobal (msg) {
    const data = JSON.parse(msg.data)
    const { matchUid, openMatch, msgFromHost } = this.obainOpenMatch(msg, data)
    switch (data.type) {
      case 'ping-global': {
        const now = Date.now()
        this.lastPingSelf = now
        this.playersOnline[msg.from] = { lastPing: now }

        if (msgFromHost) openMatch.lastPing = now
        else this.publishHostOther(matchUid, { type: 'discover' })
      } break
      case 'hosting':
        this.subHandleHosting(msgFromHost, openMatch, data)
        break
      case 'hosting-update':
        if (!msgFromHost) return
        if (data.playerCount > 0) openMatch.playerCount = data.playerCount
        else Vue.delete(this.openMatches, matchUid)
        break
      case 'transfer-host-global':
        if (!msgFromHost) return
        openMatch.playerName = data.newHostName
        openMatch.netKeyHost = data.netKeyHost
        --openMatch.playerCount
        if (openMatch.playerCount <= 0) Vue.delete(this.openMatches, matchUid) // Superfluous
        break
      case 'close-match':
        if (!msgFromHost) return
        if (this.netMatch !== openMatch) Vue.delete(this.openMatches, matchUid)
        break
      default:
        this.gotUnknownMessage('netHandleGlobal', msg)
    }
  }

  netHandleMatch (msg) {
    const { match } = this
    const { players, turnPlayers, playerSelf, turnInProgress } = match
    const msgFromHost = msg.from === this.netKeyHost
    const forClients = !this.isHost && msgFromHost
    const data = JSON.parse(msg.data)
    let player = match.getPlayerByNetKey(msg.from)
    if (this.state === 'reconnecting') player = undefined
    switch (data.type) {
      case 'ping-match':
        if (!player) return
        this.lastPingSelf = Date.now()
        player.lastPing = Date.now()
        if (data.turn === match.turn) {
          player.endTurn = data.endTurn
          player.completeTurn = data.completeTurn
          // if (data.endTurn) player.endTurn = true
          // if (data.completeTurn) player.completeTurn = true
        }
        if (player.netKey === this.netKeyHost) {
          for (const player of players) player.hostCandidates = undefined
          // this.election = undefined
        }
        if (this.isHost && (Date.now() - this.lastPingHostCheck) > pingDelay) {
          this.lastPingHostCheck = Date.now()
          this.hostCheckTurnProgress()
        }
        break
      case 'timeout-player': {
        if (!msgFromHost) return
        const player = match.getPlayerById(data.id)
        if (!player) return // Shouldn't happen
        player.endTurn = true // data.endTurn
        player.completeTurn = data.completeTurn
        this.hostCheckTurnProgress()
      } break
      case 'host-seems-dead': {
        if (!player) return
        if (!playerSelf.hostCandidates) return
        // if (data.netKeyHost !== this.netKeyHost) return
        player.hostCandidates = data.hostCandidates
        let neededVotes = Math.max(1, match.players.reduce((rv, player) => rv + (player.lastPingTimeout ? 0 : 1), 0))
        const votes = {}
        let someoneHasEnoughVotes = false
        for (const player of players) {
          if (player.hostCandidates) {
            neededVotes = Math.max(neededVotes, player.hostCandidates.length)
            for (const hostCandidate of player.hostCandidates) {
              votes[hostCandidate] = votes[hostCandidate] === undefined ? 1 : votes[hostCandidate] + 1
              if (votes[hostCandidate] >= neededVotes) someoneHasEnoughVotes = true
            }
          }
        }
        if (!someoneHasEnoughVotes) return
        const voteList = Object.entries(votes)
        voteList.sort((a, b) => {
          if (a[1] === b[1]) return a[0].localeCompare(b[0])
          return a[1] - b[1]
        })
        const bestCandidate = voteList[0]
        if (bestCandidate[1] < neededVotes) return // Superfluous
        if (this.netKey === bestCandidate[0]) {
          this.becomeHost()
          this.publishMatch({ type: 'finish-host-election' })
        }
        // if (!this.election || this.election.netKeyHost !== bestCandidate[0]) this.election = { netKeyHost: bestCandidate[0], neededVotes, votes: [], votes2: [] }
        // this.election.neededVotes = neededVotes
        // this.publishMatch({ type: 'elect-host', netKeyHost: bestCandidate[0], votesConfirmed: this.election.votes })
      } break
      // case 'elect-host': {
      //   if (!player) return
      //   const { election } = this
      //   if (!election) return
      //   if (election.netKeyHost !== data.netKeyHost || !match.getPlayerByNetKey(data.netKeyHost)) {
      //     this.election = undefined
      //     this.publishMatch({ type: 'abort-host-election' })
      //     return
      //   }
      //   if (!election.votes.includes(msg.from)) election.votes.push(msg.from)
      //   for (const vote of data.votesConfirmed) ...
      //   if (election.votes.length >= election.neededVotes) {
      //     this.netKeyHost = election.netKeyHost
      //     if (this.netKey === this.netKeyHost) {
      //       this.becomeHost()
      //       this.publishMatch({ type: 'finish-host-election' })
      //     }
      //   }
      // } break
      case 'finish-host-election':
        if (!player) return
        // if (!this.election) return
        this.netKeyHost = msg.from
        // this.election = undefined
        for (const player of match.players) player.hostCandidate = undefined
        break
      // case 'abort-host-election':
      //   if (!player) return
      //   this.election = undefined
      //   for (const player of match.players) player.hostCandidate = undefined
      //   break
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
        if (!player) return
        const playerName = player.name || '[PLAYER NOT FOUND]'
        this.chatMessages.unshift({ playerName, text: data.text })
        if (!glos.rightDrawerOpen) this.newChatMessages = true
        break
      case 'player-reconnected':
        if (!msgFromHost) return
        player = match.getPlayerByNetKey(data.netKeyOld)
        if (!player) return
        player.netKey = data.netKey
        player.endTurn = turnInProgress
        player.completeTurn = false
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
          player.endTurn = false
          player.completeTurn = false
        }
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
      case 'reconnect-request': {
        if (this.state !== 'playing') {
          sendBack({ type: 'reconnect-refused', why: 'not-playing', data: this.state })
          return
        }
        let incorrect = player && player.netKey !== data.netKey
        if (!incorrect) {
          player = match.getPlayerByNetKey(data.netKey)
          incorrect = !player
        }
        if (incorrect) {
          sendBack({ type: 'reconnect-refused', why: 'incorrect-player' })
          return
        }
        if (!player.lastPingTimeout) return // Wait to ensure that the given player really had a time out (the requester should repeat the request eventually)
        if (turnInProgress) return // Also don't allow joining during a turn because that probably still has unsolved issues
        player.endTurn = turnInProgress
        player.completeTurn = false
        const matchData = this.matchHistoryLast
        if (player.netKey !== msg.from) {
          const netKeyOld = player.netKey
          player.netKey = msg.from
          matchData.players.find(playerData => playerData.netKey === netKeyOld).netKey = player.netKey
          this.publishMatch({ type: 'player-reconnected', netKeyOld, netKey: player.netKey, turnInProgress })
        }
        sendBack({ type: 'reconnect-response', matchData, netMatch: this.netMatch, turnInProgress })
      } break
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

          const player = initPlayer(this, playerName)
          player.netKey = msg.from
          this.match.placeBots()
          // peerInfo.playerId = player.id
          sendBack({ type: 'join-result', matchUid, players: players.map(player => player.serialize(false)), playerSelfId: player.id })
          this.publishMatch({ type: 'other-player-joined', player: player.serialize(false) })
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
    const data = JSON.parse(msg.data)
    const { openMatch, msgFromHost } = this.obainOpenMatch(msg, data)
    switch (data.type) {
      case 'hosting':
        this.subHandleHosting(msgFromHost, openMatch, data)
        break
      case 'join-result':
        if (!msgFromHost || data.matchUid !== this.isJoining) return
        this.isJoining = false
        if (data.cantJoinReason) this.joinFailed('rejected', data.cantJoinReason)
        else this.joined(msg.from, this.openMatches[data.matchUid], data.players, data.playerSelfId)
        break
      case 'reconnect-refused':
        if (this.state !== 'reconnecting') return
        this.clearReconnectData()
        glos.dialogData = data
        break
      case 'reconnect-response':
        if (this.state !== 'reconnecting') return
        this.state = 'playing'
        this.clearReconnectData()
        this.netMatch = data.netMatch
        this.deserializeMatch(data.matchData)
        this.regenerateMap(false)
        this.match.prepareTurnPlayers()
        this.matchHistory.push(data.matchData)
        this.matchHistoryLast = data.matchData
        if (data.turnInProgress) this.startTurn()
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
      this.netNode.pubsub.subscribe(netTopic.topic, handler)
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
    match.playerSelf = match.getPlayerByNetKey(this.netKey)
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
    match.playerSelf = initPlayer(this, netMatch.playerName)
    glos.adjustPlayerSelf()
    match.playerSelf.netKey = this.netKey
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
    this.netKeyHost = this.netKey
    this.isHost = true
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

    this.publishHostNew(matchUid, { type: 'try-join', playerName, password })

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
    // this.callPeer(this.peerInfoHost, { type: 'leave' })
    this.leaveSub()
  }

  leaveSub () {
    this.netMatch = undefined
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
      match.setRngSeedStr(game.netMatch.seed)
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
