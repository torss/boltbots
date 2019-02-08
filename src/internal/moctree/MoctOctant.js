/**
 * @author torss / https://github.com/torss
 *
 * MoctOctant
 */

import * as THREE from 'three'
import {MoctCubeSide} from './MoctCubeSide'

export const moctOctants = []

/**
 * Moctree constant Octant info
 */
export class MoctOctant {
  constructor (x, y, z, index = -1) {
    this.index = index
    this.direction = new THREE.Vector3(x, y, z)
    this.neighbors = undefined // Must be created after all regular MoctOctants were created
  }

  completeRegularOctant () {
    this.neighbors = 'xyz'.split('').map(coord => {
      const innerDirection = this.direction.clone()
      innerDirection[coord] *= -1
      return {
        outerSide: MoctCubeSide.byCoordSign(coord, this.direction[coord]),
        innerSide: MoctCubeSide.byCoordSign(coord, innerDirection[coord]),
        octantNei: MoctOctant.byDirection(innerDirection)
      }
    })
  }

  static byDirection (direction, exact = false) {
    const moctOctant = moctOctants[(direction.x >= 0 ? 1 : 0) + (direction.y >= 0 ? 2 : 0) + (direction.z >= 0 ? 4 : 0)]
    if (!moctOctant) return undefined
    if (exact && !moctOctant.direction.equals(direction)) {
      throw new Error('MoctOctant.byDirection sanity check failed: moctOctants order broken!')
    }
    return moctOctant
  }

  static bySides (side) {
    return moctOctants[(side.x ? 1 : 0) + (side.y ? 2 : 0) + (side.z ? 4 : 0)]
  }
}
