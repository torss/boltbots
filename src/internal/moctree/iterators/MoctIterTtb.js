/**
 * @author torss / https://github.com/torss
 *
 * MoctIterTtb & MoctIterTtbSub test iterators
 */

import * as THREE from 'three'

/**
 * Moctree "top-to-bottom" test iterator
 */
export class MoctIterTtb {
  constructor (moctNode) {
    this.node = undefined
    this.origin = undefined
    this.subIters = [new MoctIterTtbSub(moctNode)]
  }

  next () {
    const subIters = this.subIters
    for (let subIter; (subIter = subIters[subIters.length - 1]);) {
      const moctNodeNext = subIter.next().value
      if (!moctNodeNext) {
        subIters.pop()
        continue
      }
      if (moctNodeNext.isLeaf) {
        this.node = moctNodeNext
        this.origin = subIter.origin
        return this
      }
      subIter = new MoctIterTtbSub(moctNodeNext, subIter)
      subIters.push(subIter)
    }
    return undefined
  }
}

/**
 * MoctIterTtb sub-stage
 */
class MoctIterTtbSub {
  constructor (moctNode, parent) {
    this.moctNode = moctNode
    this.index = -1
    this.value = undefined
    this.parentOrigin = parent
      ? parent.origin.clone()
      : (moctNode.isTln ? moctNode.moctree.origin.clone() : new THREE.Vector3(0, 0, 0))
    this.origin = new THREE.Vector3(0, 0, 0)
  }

  next () {
    ++this.index
    if (this.moctNode.isLeaf) this.value = this.index >= 1 ? undefined : this.moctNode
    else this.value = this.index >= 8 ? undefined : this.moctNode.subs[this.index]
    if (this.value) {
      this.origin.copy(this.parentOrigin).addScaledVector(this.value.octant.direction, this.value.level.scaleHalf)
    }
    return this
  }
}
