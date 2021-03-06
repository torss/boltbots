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

function pushBase (bufferAttributeExt, itemSizeReq, funcName, data, assignFunc) {
  if (bufferAttributeExt.itemSize !== itemSizeReq) throw new TypeError('BufferAttributeExt: Can\'t use ' + funcName + ' since itemSize !== ' + itemSizeReq)
  bufferAttributeExt.padSize(bufferAttributeExt.countCurrent + data.length)
  for (let i = 0; i < data.length; ++i) assignFunc(data[i])
  return bufferAttributeExt
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

  clear (resize = true) {
    if (resize) this.resize(0)
    this.countCurrent = 0
    this.indexCurrent = 0
    return this
  }

  padSize (newCountCurrent) {
    this.countCurrent = newCountCurrent
    if (this.count < this.countCurrent) this.resize(Math.nextPowerOfTwo(this.countCurrent))
    return this
  }

  fitSize (markForUpdate = true) {
    this.resize(this.countCurrent)
    this.indexCurrent = this.countCurrent * this.itemSize
    if (markForUpdate) this.needsUpdate = true
    return this
  }

  pushScalar (...scalars) {
    return pushBase(this, 1, 'pushScalar', scalars, (scalar) => {
      this.array[this.indexCurrent++] = scalar
    })
  }

  pushVector2 (...vector2s) {
    return pushBase(this, 2, 'pushVector2', vector2s, (vector2) => {
      this.array[this.indexCurrent++] = vector2.x
      this.array[this.indexCurrent++] = vector2.y
    })
  }

  upushVector3 (...vector3s) {
    for (let i = 0; i < vector3s.length; ++i) {
      const vector3 = vector3s[i]
      this.array[this.indexCurrent++] = vector3.x
      this.array[this.indexCurrent++] = vector3.y
      this.array[this.indexCurrent++] = vector3.z
    }
  }

  upushVector4 (...vector4s) {
    for (let i = 0; i < vector4s.length; ++i) {
      const vector4 = vector4s[i]
      this.array[this.indexCurrent++] = vector4.x
      this.array[this.indexCurrent++] = vector4.y
      this.array[this.indexCurrent++] = vector4.z
      this.array[this.indexCurrent++] = vector4.w
    }
  }

  pushVector3 (...vector3s) {
    // return pushBase(this, 3, 'pushVector3', vector3s, (vector3) => {
    //   this.array[this.indexCurrent++] = vector3.x
    //   this.array[this.indexCurrent++] = vector3.y
    //   this.array[this.indexCurrent++] = vector3.z
    // })

    this.padSize(this.countCurrent + vector3s.length)
    this.upushVector3(...vector3s)
  }

  pushVector3proto (vector3) {
    // this.padSize(this.countCurrent + 1)
    // this.array[this.indexCurrent + 0] = vector3.x
    // this.array[this.indexCurrent + 1] = vector3.y
    // this.array[this.indexCurrent + 2] = vector3.z
    // this.indexCurrent += 3

    if (this.count < ++this.countCurrent) this.resize(Math.nextPowerOfTwo(this.countCurrent))
    this.array[this.indexCurrent++] = vector3.x
    this.array[this.indexCurrent++] = vector3.y
    this.array[this.indexCurrent++] = vector3.z
  }
}

/**
 * BufferAttributeExt for indices
 */
export class BufferAttributeExtIndex extends BufferAttributeExt {
  constructor (array = new Uint16Array()) {
    super(array, 1)
    this.highestStoredIndex = -1
  }

  fitSize () {
    const is32bit = this.array instanceof Uint32Array
    const needs32bit = this.highestStoredIndex > 2 ** 16 - 1
    if (is32bit && !needs32bit) {
      this.array = new Uint16Array(this.array.subarray(0, this.countCurrent))
      this.count = this.countCurrent
      this.indexCurrent = this.countCurrent * this.itemSize
    } else {
      super.fitSize()
    }
    return this
  }

  pushWithOffset (offset, ...indices) {
    let is32bit = this.array instanceof Uint32Array
    return pushBase(this, 1, 'pushVector3', indices, (index) => {
      index += offset
      if (!is32bit) {
        const needs32bit = index > 2 ** 16 - 1
        if (needs32bit) {
          this.array = new Uint32Array(this.array)
          is32bit = true
        }
      }
      this.array[this.indexCurrent++] = index
      if (this.highestStoredIndex < index) this.highestStoredIndex = index
    })
  }

  pushRelative (...indices) {
    return this.pushWithOffset(this.highestStoredIndex + 1, ...indices)
  }

  pushRelativeWithOffset (offset, ...indices) {
    return this.pushWithOffset(offset + this.highestStoredIndex + 1, ...indices)
  }
}
