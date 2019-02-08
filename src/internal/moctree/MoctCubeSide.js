/**
 * @author torss / https://github.com/torss
 *
 * MoctCubeSide
 */

import * as THREE from 'three'
import {MoctOctant} from './MoctOctant'

export const moctCubeSides = []

/**
 * Moctree constant Cube Side info
 */
export class MoctCubeSide {
  constructor (coord, sign) {
    this.index = -1
    this.coord = coord // Coordinate key
    this.compCoords = 'xyz'.split('').filter(k => k !== coord) // Complementary coordinate keys
    this.sign = sign
    this.normal = new THREE.Vector3(0, 0, 0)
    this.normal[coord] = sign
    this.complement = undefined // Must be set after all MoctCubeSide were created
    this.octants = undefined // Must be created after all regular MoctOctants were created

    this.face = []
    const scale = 1
    const range = [-scale, scale]
    for (const a of range) {
      for (const b of range) {
        const vert = new THREE.Vector3(0, 0, 0)
        vert[this.compCoords[0]] = a
        vert[this.compCoords[1]] = b
        vert[this.coord] = scale * sign
        this.face.push(vert)
      }
    }

    // Draw couner-clockwise
    if ((sign >= 0) !== (coord !== 'y')) {
      this.faceDrawCc = this.face
    } else {
      this.faceDrawCc = this.face.slice()
      this.faceDrawCc[1] = this.face[2]
      this.faceDrawCc[2] = this.face[1]
    }
  }

  completeCubeSide () {
    this.complement = MoctCubeSide.byCoordSign(this.coord, -this.sign)
    this.octants = this.face.map(vert => MoctOctant.byDirection(vert.clone(), true)) // Assumes face was created with scale = 1
  }

  static byCoordSign (coord, sign) {
    const moctCubeSide = moctCubeSides[new THREE.Vector3(0, 2, 4)[coord] + (sign >= 0 ? 1 : 0)]
    if (!moctCubeSide) return undefined
    if (moctCubeSide.coord !== coord || (moctCubeSide.sign >= 0) !== (sign >= 0)) {
      throw new Error('MoctCubeSide.byCoordSign sanity check failed: moctCubeSides order broken!')
    }
    return moctCubeSide
  }
}
