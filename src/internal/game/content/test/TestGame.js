import * as THREE from 'three'
import { mapGens, cardTypeList } from '..'
import { Match, Player, Card, CardSlot } from '../..'

export function initTestGame (game) {
  const scene = game.scene
  initDirectionalLight(scene)

  const mapGen = mapGens['TestGen0']
  const map = mapGen.func(game.tiTys)
  initMapMaterial(map, game.envMap)
  map.remesh(scene)

  initModels(game, game.envMap)

  const match = new Match()
  game.match = match
  const player = new Player()
  addPlayerCards(player)
  match.playerSelf = player
  match.players.push(player)
  initBot(game, player.bot)
}

function addPlayerCards (player) {
  for (const cardType of cardTypeList) {
    const cardSlot = new CardSlot()
    const card = new Card(cardType)
    cardSlot.card = card
    player.cardSlots.push(cardSlot)
  }
}

function initBot (game, bot) {
  const obj = game.models['Bot']
  bot.object3d = obj
  bot.directionKey = 'N'
  // obj.lookAt(new THREE.Vector3(0, 0, -1))
  obj.position.y = 2
  obj.position.x = 7 // dim.x / 2
  obj.position.z = 7 // dim.z / 2
  game.scene.add(obj)
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

function initDirectionalLight (scene) {
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(-5, 2, -5)
  light.castShadow = true // default false
  light.shadow.mapSize.width = 2048 // default 512
  light.shadow.mapSize.height = 2048 // default 512
  light.shadow.camera.top = 15
  light.shadow.camera.left = -15
  light.shadow.camera.right = 15
  scene.add(light)
}
