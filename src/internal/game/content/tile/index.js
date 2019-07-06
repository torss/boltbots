import * as THREE from 'three'
import { TiTy } from '../../../btile'

export function initTiTys (tiShs) {
  const tiTys = {}
  const addTiTy = (tiSh, key) => {
    tiTys[key] = createTiTy(tiSh, key)
    return tiTys[key]
  }
  for (const [key, tiSh] of Object.entries(tiShs)) {
    addTiTy(tiSh, key)
  }

  let tiTy = addTiTy(tiShs['Cube'], 'Ground')
  tiTy.color = new THREE.Vector4(173 / 255, 131 / 255, 83 / 255, 1)

  tiTy = addTiTy(tiShs['Floor0'], 'Pavement')
  // tiTy.color = new THREE.Vector4(196 / 255, 196 / 255, 196 / 255, 1)
  tiTy.color = new THREE.Vector4(1, 1, 1, 1)

  for (let i = 0; i <= 1; ++i) tiTys['Wall' + i].wall = true

  return tiTys
}

function createTiTy (tiSh, key) {
  return extendTiTy(new TiTy(tiSh), key)
}

function extendTiTy (tiTy, key) {
  tiTy.key = key
  tiTy.wall = false
  return tiTy
}
