import * as THREE from 'three'
import { TiTy } from '../../../btile'

export function initTiTys (tiShs) {
  const tiTys = {}
  for (const [key, tiSh] of Object.entries(tiShs)) {
    tiTys[key] = new TiTy(tiSh)
  }

  tiTys['Ground'] = new TiTy(tiShs['Cube'])
  tiTys['Ground'].color = new THREE.Vector4(173 / 255, 131 / 255, 83 / 255, 1)
  tiTys['Pavement'] = new TiTy(tiShs['Floor0'])
  // tiTys['Pavement'].color = new THREE.Vector4(196 / 255, 196 / 255, 196 / 255, 1)
  tiTys['Pavement'].color = new THREE.Vector4(1, 1, 1, 1)

  return tiTys
}
