import * as THREE from 'three'
import { mapGens, cardTypeList } from '..'
import { Match, Player, Card, CardSlot } from '../..'
import { glos } from '../../../Glos'

export function initTestGame (game) {
  const scene = game.scene

  const mapGen = mapGens['TestGen0']
  const { map, controlTowerTilePosition } = mapGen.func(game.tiTys)
  initMapMaterial(map, game.envMap)
  map.remesh(scene)
  const match = new Match()
  game.match = match
  match.map = map
  match.controlTower.position.copy(controlTowerTilePosition).addScalar(0.5)

  initDirectionalLight(game)

  initModels(game, game.envMap)

  for (let i = 0; i < 4; ++i) {
    const player = new Player(game, undefined, 'Player-' + (i + 1))
    addPlayerCards(player)
    initBot(game, player.bot, i)
    match.players.push(player)
  }
  match.playerSelf = match.players[0]
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
  color.add(colors[i % colors.length].multiplyScalar(2))
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
  obj.add(lazorOrb)

  game.scene.add(obj)
  bot.enterOnMap()
}

function initModels (game, envMap) {
  for (const model of Object.values(game.models)) {
    model.traverseVisible(obj => {
      if (obj.isMesh) {
        obj.material.envMap = envMap
      }
    })
  }
}

function initMapMaterial (map, envMap) {
  map.tiMa.materials.default = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.90,
    roughness: 0.20,
    envMap,
    envMapIntensity: 1,
    vertexColors: THREE.VertexColors
  })
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
