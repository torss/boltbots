import * as THREE from 'three'
import { Sides } from './Sides'

/**
 * Dimensions
 */
export class Dim extends THREE.Vector3 {
  constructor (x, y, z) {
    x = x || y || z
    super(x, y || x, z || x)
    this.sq = this.x * this.y
    this.cu = this.sq * this.z
  }

  iterate (func) {
    const pos = new THREE.Vector3(0, 0, 0)
    const { x, y, z } = this
    let i = 0
    const sides = new Sides(() => ({ i: 0, valid: false }))
    sides['X-'].i = -1
    sides['X+'].i = +1
    sides['Y-'].i = -this.x
    sides['Y+'].i = +this.x
    sides['Z-'].i = -this.sq
    sides['Z+'].i = +this.sq
    for (pos.z = 0; pos.z < z; ++pos.z) {
      sides['Z-'].valid = pos.z > 0
      sides['Z+'].valid = pos.z + 1 < z
      for (pos.y = 0; pos.y < y; ++pos.y) {
        sides['Y-'].valid = pos.y > 0
        sides['Y+'].valid = pos.y + 1 < y
        for (pos.x = 0; pos.x < x; ++pos.x, ++i) {
          sides['X-'].valid = pos.x > 0
          sides['X+'].valid = pos.x + 1 < x
          if (func(pos, i, sides) === false) return
          sides.iterate((sideName, sideValue) => ++sideValue.i)
        }
      }
    }
  }
}
