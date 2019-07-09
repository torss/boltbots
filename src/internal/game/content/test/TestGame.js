import * as THREE from 'three'
// import * as TWEEN from '@tweenjs/tween.js'
import { mapGens, cardTypeList } from '..'
import { Match, Player, Card, CardSlot } from '../..'
import { glos } from '../../../Glos'

export function initTestGame (game) {
  const match = new Match(game)
  match.mapGen = mapGens['TestGen0']
  game.match = match

  game.regenerateMap(false)
  initDirectionalLight(game)
  initModels(game, game.envMap)
  game.recreatePlayers(true)
}

function addPlayerCards (player) {
  for (const cardType of cardTypeList) {
    const card = new Card(cardType)
    player.hand.push(card)
    // const cardSlot = new CardSlot()
    // cardSlot.card = card
    // player.bot.cardSlots.push(cardSlot)
  }
  for (let i = 0; i < 5; ++i) player.bot.cardSlots.push(new CardSlot())
}

export function initPlayers (game, count, lobbyPeers) {
  const playerIcons = ['robot', 'robot-industrial', 'tank', 'settings', 'face-agent', 'alien', 'laptop', 'desktop-classic', 'account-badge', 'account-card-details', 'pirate', 'target', 'target', 'target-variant', 'emoticon-devil']

  const { match } = game
  if (count === undefined) count = lobbyPeers.length

  match.playerSelf = undefined
  match.players = []
  for (let i = 0; i < count; ++i) {
    let playerName = 'Player-' + (i + 1)
    const peerInfo = lobbyPeers && lobbyPeers[i]
    if (peerInfo) playerName = peerInfo.playerName
    const player = new Player(game, undefined, playerName)
    if (peerInfo) {
      peerInfo.player = player
      // player.peerInfo = peerInfo
    }
    player.icon = playerIcons[i % playerIcons.length]
    addPlayerCards(player)
    initBot(game, player.bot, i)
    match.players.push(player)
    if (peerInfo ? peerInfo.isSelf : i === 0) match.playerSelf = player
  }
  match.turnPlayers = [...match.players]
}

function initBot (game, bot, i) {
  const obj = game.models['Bot'].clone()

  const material = obj.children[0].material.clone()
  const color = material.color
  const colors = [
    new THREE.Color(1, 1, 0),
    new THREE.Color(1, 0.25, 0),
    new THREE.Color(1, 0, 0),
    new THREE.Color(0.25, 0, 0),
    //
    new THREE.Color(1, 1, 1),
    new THREE.Color(0, 0, 0.25),
    new THREE.Color(0, 0, 0.5),
    new THREE.Color(0, 0, 0),
    new THREE.Color(0, 1, 0),
    new THREE.Color(0.75, 0.75, 0),
    new THREE.Color(0.25, 0, 1)
  ]
  const selectedColor = colors[i % colors.length].multiplyScalar(2)
  bot.guiColor.copy(selectedColor)
  color.add(selectedColor)
  // color.r = 1 + (i % 4 === 0) * 2
  // color.g = 1 + (i % 4 === 1) * 2
  // color.b = 1 + (i % 4 === 2) * 2
  obj.traverseVisible(obj => {
    if (obj.isMesh) {
      obj.material = material
    }
  })

  bot.object3d = obj
  bot.directionKey = 'N'
  // obj.lookAt(new THREE.Vector3(0, 0, -1))
  obj.position.y = 2
  obj.position.x = 7 // dim.x / 2
  obj.position.z = 4 + i * 2 // dim.z / 2

  const lazorOrb = game.models['lazor-orb'].clone()
  lazorOrb.position.y = 0.07
  lazorOrb.position.z = 0.23
  lazorOrb.bloom = true
  bot.lazorOrb = lazorOrb
  obj.add(lazorOrb)

  const sound = new THREE.PositionalAudio(game.audioListener)
  glos.adjustAudioVolume()
  const oscillator = game.audioListener.context.createOscillator()
  oscillator.type = 'square'
  oscillator.frequency.setValueAtTime(6, sound.context.currentTime)
  oscillator.start(0)
  // const oscillatorCtrl = { freq: 6 }
  // new TWEEN.Tween(oscillatorCtrl).to({ freq: 64 }, 2000).repeat(Infinity).yoyo(true).easing(TWEEN.Easing.Bounce.InOut).onUpdate(() => {
  //   oscillator.frequency.setValueAtTime(oscillatorCtrl.freq, sound.context.currentTime)
  // }).start()
  sound.setNodeSource(oscillator)
  sound.setRefDistance(1)
  sound.setVolume(0.01)
  bot.engineSound = sound
  bot.engineSoundGen = oscillator
  obj.add(sound)

  game.scene.add(obj)
}

function initModels (game, envMap) {
  for (const material of Object.values(game.materials)) {
    if (!material.envMap) material.envMap = envMap
  }
  for (const model of Object.values(game.models)) {
    model.traverseVisible(obj => {
      if (obj.isMesh) {
        obj.material.envMap = envMap
      }
    })
  }
}

function initDirectionalLight (game) {
  const scene = game.scene

  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(-5, 2, -5)
  light.castShadow = true // default false
  light.shadow.mapSize.width = 2048 // default 512
  light.shadow.mapSize.height = 2048 // default 512

  const dim = game.match.map.tiMa.dim
  const dimHalf = new THREE.Vector3().copy(dim).multiplyScalar(0.5)
  light.shadow.camera.top = dim.length()
  light.shadow.camera.left = -Math.max(dim.x, dim.z)
  light.shadow.camera.right = -light.shadow.camera.left
  light.target.position.copy(dimHalf)
  light.target.position.y = light.shadow.camera.top * -0.5

  scene.add(light)
  scene.add(light.target)
  // const helper = new THREE.CameraHelper(light.shadow.camera)
  // scene.add(helper)

  glos.preAnimateFuncs.push(() => {
    const sunPos = glos.skyUniforms.sunPosition.value
    const lightPos = light.position
    const dim = game.match.map.tiMa.dim
    const dimAdj = new THREE.Vector3().copy(dim)
    dimAdj.y = 0
    const dimHalfAdj = new THREE.Vector3().copy(dimAdj).multiplyScalar(0.5)
    const sunPosAdj = new THREE.Vector3().copy(sunPos).normalize().multiplyScalar(dim.length()).add(dimHalfAdj)
    lightPos.copy(sunPosAdj)
    // light.target.position.copy(dimHalf).y *= -0.5
  })
}
