/**
 * @author torss / https://github.com/torss
 *
 * MoctMesher
 */

import * as THREE from 'three'

import {moctCubeSides} from './MoctCubeSide'
import {MoctIterTtb} from './iterators'

/**
 * Moctree mesher
 */
export class MoctMesher {
  constructor (moctree) {
    this.moctree = moctree
  }

  mesh () {
    const moctree = this.moctree
    const geometry = new THREE.BufferGeometry()
    const vertices = []
    const normals = []
    const pushFace = (origin, scale, moctCubeSide) => {
      const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
      points[0].pushOnto(vertices)
      points[1].pushOnto(vertices)
      points[2].pushOnto(vertices)
      points[1].pushOnto(vertices)
      points[3].pushOnto(vertices)
      points[2].pushOnto(vertices)
      for (let i = 0; i < 6; ++i) moctCubeSide.normal.pushOnto(normals)
    }
    for (let iterTtb = new MoctIterTtb(moctree.tln); iterTtb.next();) {
      const moctNode = iterTtb.node
      const origin = iterTtb.origin
      if (moctNode.material === undefined) continue
      const level = moctNode.level
      const scale = level.scaleHalf
      moctCubeSides.forEach(moctCubeSide => {
        const side = moctNode.sides[moctCubeSide.index]
        if (side.isVisible) pushFace(origin, scale, moctCubeSide)
      })
    }
    geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
    geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
    return geometry
  }
}
