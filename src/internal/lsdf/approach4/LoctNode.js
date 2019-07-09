import { moctOctants } from '../../moctree/MoctOctant'
import { moctOctantTln } from '../../moctree'

export class LoctNode {
  constructor (level, parent, octant = moctOctantTln) {
    this.level = level
    ++level.counter
    this.parent = parent
    this.octant = octant
    this.subs = [] // Subdivisions (Child nodes)
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
    return this.subs.length === 0
  }

  split () {
    if (!this.isLeaf) return this
    if (this.parent) --this.parent.subLeafCount
    this.subLeafCount = 8
    const subLevel = this.level.obtainChild()
    for (let i = 0; i < 8; ++i) this.subs.push(new LoctNode(subLevel, this, moctOctants[i]))
    return this
  }
}
