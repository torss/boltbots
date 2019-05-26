import * as THREE from 'three'
import { Map } from '../../Map'
import { MapGen } from '../../MapGen'
import { Dim, TiMa, TiEn } from '../../../btile'

export const mapGenList = []

mapGenList.push(MapGen.createV0('TestGen0', (tiTys) => {
  const dim = new Dim(16)
  const tiMa = new TiMa(dim)
  const map = new Map(tiMa)
  // tiMa.materials.default = material2 // TODO

  const groundHeight = 2
  const outerWallHeight = 2

  new THREE.Vector3(dim.x, groundHeight, dim.z).iterXyz(pos => {
    let i = dim.resolve(pos)
    tiMa.tiEns[i] = new TiEn(tiTys['Ground'])
  })

  new THREE.Vector3(dim.x, outerWallHeight, dim.z).iterXyz(pos => {
    let i = dim.resolve(new THREE.Vector3(0, groundHeight, 0).add(pos))
    if (pos.x === 0 || pos.z === 0 || pos.x === dim.x - 1 || pos.z === dim.z - 1) {
      let tiTyKey = 'Wall1'
      if ((pos.x === 0 && pos.z === 0) || (pos.y < outerWallHeight - 1 && ((pos.x + pos.z) % 3 !== 0))) {
        tiTyKey = 'Wall0'
      }
      tiMa.tiEns[i] = new TiEn(tiTys[tiTyKey])
    }
  })

  new THREE.Vector3(dim.x, 1, dim.z).iterXyz(pos => {
    let i = dim.resolve(new THREE.Vector3(0, groundHeight, 0).add(pos))
    if (!(pos.x === 0 || pos.z === 0 || pos.x === dim.x - 1 || pos.z === dim.z - 1)) {
      tiMa.tiEns[i] = new TiEn(tiTys['Pavement'])
    }
  })

  tiMa.tiEns[dim.resolve(new THREE.Vector3(0, groundHeight + outerWallHeight, 0))] = new TiEn(tiTys['ControlTower0'])

  return map
}))
