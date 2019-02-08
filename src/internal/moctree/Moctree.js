/**
 * @author torss / https://github.com/torss
 *
 * Moctree
 */

import * as THREE from 'three'
import {MoctNode} from './MoctNode'
import {MoctLevel} from './MoctLevel'
import {MoctOctant} from './MoctOctant'

/**
  * Primary Moctree control structure
  */
export class Moctree {
  constructor () {
    this.origin = new THREE.Vector3(0, 0, 0) // Center of the top-level-node
    this.scale = 1 // Scale of the top-level node
    this.tln = new MoctNode(new MoctLevel(this)) // Top-level-node
    this.lowestLevel = this.tln.level
  }

  getAt (position, minDepth = 0, maxDepth = Infinity) {
    if (maxDepth < minDepth) return undefined
    let node = this.tln
    const origin = this.origin.clone()
    while (node.depth < minDepth || (!node.isLeaf && node.depth < maxDepth)) {
      origin.addScaledVector(node.octant.direction, node.level.scaleHalf)
      node = node.split().subs[MoctOctant.byDirection(new THREE.Vector3().subVectors(position, origin)).index]
    }
    return node
  }

  // NOTE: Only used in one place right now
  createBoundingBox () {
    return new THREE.Box3(
      this.origin.clone().subScalar(this.tln.level.scaleHalf),
      this.origin.clone().addScalar(this.tln.level.scaleHalf)
    )
  }
}
