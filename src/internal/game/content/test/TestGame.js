import * as THREE from 'three'
import { mapGens } from '..'

export function initTestGame (game) {
  const scene = game.scene
  initDirectionalLight(scene)

  const mapGen = mapGens['TestGen0']
  const map = mapGen.func(game.tiTys)
  initMapMaterial(map, game.envMap)
  map.remesh(scene)
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
