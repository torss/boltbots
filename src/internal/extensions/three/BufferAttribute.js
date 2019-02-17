import * as THREE from 'three'
import '../Math'

THREE.BufferAttribute.prototype.resize = function (newCount) {
  if (newCount === this.count) return
  const newLength = newCount * this.itemSize
  let newArray
  if (newCount < this.count) {
    newArray = this.array.slice(0, newLength)
  } else {
    newArray = new this.array.constructor(newLength)
    newArray.set(this.array)
  }
  this.array = newArray
  this.count = newCount
  return this
}

/**
 * Extended THREE.BufferAttribute for progressive resizing
 */
export class BufferAttributeExt extends THREE.BufferAttribute {
  constructor (array, itemSize, normalized) {
    super(array, itemSize, normalized)
    this.countCurrent = this.count
    this.indexCurrent = this.array.length
  }

  padSize (newCountCurrent) {
    this.countCurrent = newCountCurrent
    this.resize(Math.nextPowerOfTwo(this.countCurrent))
    return this
  }

  fitSize () {
    this.resize(this.countCurrent)
    this.indexCurrent = this.countCurrent * this.itemSize
    return this
  }

  pushVector3 (...vector3s) {
    if (this.itemSize !== 3) throw new TypeError('BufferAttributeExt: Can\'t use pushVector3 since itemSize !== 3')
    this.padSize(this.countCurrent + vector3s.length)
    let index = this.indexCurrent
    for (let i = 0; i < vector3s.length; ++i) {
      const vector3 = vector3s[i]
      this.array[index++] = vector3.x
      this.array[index++] = vector3.y
      this.array[index++] = vector3.z
    }
    this.indexCurrent = index
    return this
  }
}
