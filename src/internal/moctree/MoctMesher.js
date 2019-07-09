/**
 * @author torss / https://github.com/torss
 *
 * MoctMesher
 */

import * as THREE from 'three'
import { BufferAttributeExt, BufferAttributeExtIndex } from '../extensions/three'

// import {moctCubeSides} from './MoctCubeSide'
import { MoctIterTtb } from './iterators'

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
    const indices = new BufferAttributeExtIndex()
    const positions = new BufferAttributeExt(new Float32Array(), 3)
    const normals = new BufferAttributeExt(new Float32Array(), 3)
    for (let iterTtb = new MoctIterTtb(moctree.tln); iterTtb.next();) {
      const moctNode = iterTtb.node
      const origin = iterTtb.origin
      this.meshNode(moctNode, origin, indices, positions, normals)
    }
    geometry.setIndex(indices.fitSize())
    geometry.addAttribute('position', positions.fitSize())
    geometry.addAttribute('normal', normals.fitSize())
    return geometry
  }

  meshNode (moctNode, origin, indices, positions, normals) {
    if (moctNode.material === undefined) return
    moctNode.shape.meshNode(moctNode, origin, indices, positions, normals)
  }
}
