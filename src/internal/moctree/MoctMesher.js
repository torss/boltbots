/**
 * @author torss / https://github.com/torss
 *
 * MoctMesher
 */

import * as THREE from 'three'

import {moctCubeSides} from './MoctCubeSide'
import {MoctIterTtb} from './iterators'
import {BufferAttributeExt} from '../extensions/three'

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
    const positions = new BufferAttributeExt(new Float32Array(0), 3)
    const normals = new BufferAttributeExt(new Float32Array(0), 3)
    for (let iterTtb = new MoctIterTtb(moctree.tln); iterTtb.next();) {
      const moctNode = iterTtb.node
      const origin = iterTtb.origin
      this.meshNode(moctNode, origin, positions, normals)
    }
    geometry.addAttribute('position', positions.fitSize())
    geometry.addAttribute('normal', normals.fitSize())
    return geometry
  }

  meshNode (moctNode, origin, positions, normals) {
    const pushFace = (origin, scale, moctCubeSide) => {
      const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
      positions.pushVector3(points[0], points[1], points[2], points[1], points[3], points[2])
      const normal = moctCubeSide.normal
      normals.pushVector3(normal, normal, normal, normal, normal, normal)
    }
    if (moctNode.material === undefined) return
    const level = moctNode.level
    const scale = level.scaleHalf
    moctCubeSides.forEach(moctCubeSide => {
      const side = moctNode.sides[moctCubeSide.index]
      if (side.isVisible) pushFace(origin, scale, moctCubeSide)
    })
  }
}
