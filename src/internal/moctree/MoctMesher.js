/**
 * @author torss / https://github.com/torss
 *
 * MoctMesher
 */

import * as THREE from 'three'
import {BufferAttributeExt} from '../extensions/three'

// import {moctCubeSides} from './MoctCubeSide'
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
    // TODO Use indices
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
    if (moctNode.material === undefined) return
    moctNode.shape.meshNode(moctNode, origin, positions, normals)
  }
}
