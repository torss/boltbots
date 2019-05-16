import {moctOctants} from '../../moctree/MoctOctant'
import {moctOctantTln} from '../../moctree'

export class LoctNode {
  constructor (level, parent, octant = moctOctantTln) {
    this.level = level
    ++level.counter
    this.parent = parent
    this.octant = octant
    this.subs = undefined // Subdivisions (Child nodes)
    this.subLeafCount = 0 // Count of (direct) subs with isLeaf === true

    this.sdfValue = 0
  }

  get loctTree () {
    return this.level.loctTree
  }

  get depth () {
    return this.level.depth
  }

  get isTln () {
    return !this.parent
  }

  get isLeaf () {
    return this.subs === undefined // || this.subs.length === 0
  }

  reuseFor (level, parent) {
    if (level !== this.level) {
      --this.level.counter
      this.level = level
      ++level.counter
    }
    this.parent = parent
  }

  split (reuseNodes) {
    if (!this.isLeaf) return this
    if (this.parent) --this.parent.subLeafCount
    this.subLeafCount = 8
    const subLevel = this.level.obtainChild()
    if (reuseNodes && reuseNodes.length > 0) {
      this.subs = reuseNodes.pop()
      for (let i = 0; i < 8; ++i) this.subs[i].reuseFor(subLevel, this)
    } else {
      this.subs = []
      for (let i = 0; i < 8; ++i) this.subs.push(new LoctNode(subLevel, this, moctOctants[i]))
    }
    return this
  }
}
