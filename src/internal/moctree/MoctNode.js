/**
 * @author torss / https://github.com/torss
 *
 * MoctNode
 */

import { moctCubeSides } from './MoctCubeSide'
import { moctOctants } from './MoctOctant'
import { MoctNodeSide } from './MoctNodeSide'
import { cubeShape } from './shapes'
import { moctOctantTln } from '.'

/**
 * Moctree Node
 */
export class MoctNode {
  constructor (level, parent, octant = moctOctantTln) {
    this.level = level
    ++level.counter
    this.parent = parent
    this.octant = octant
    this.subs = [] // Subdivisions (Child nodes)
    this.subLeafCount = 0 // Count of (direct) subs with isLeaf === true
    this.material_ = parent ? parent.material_ : undefined
    this.shape = parent ? parent.shape : cubeShape
    this.sides = moctCubeSides.map(moctCubeSide => new MoctNodeSide(this, moctCubeSide))
  }

  get material () {
    return this.material_
  }

  set material (material) {
    if (!this.isLeaf) return
    // if (material === this.material_) return
    this.setNewMaterial(material)
  }

  setNewMaterial (material) {
    const wasVisible = this.isVisible
    this.material_ = material
    if (this.isTln) return
    if (this.isVisible !== wasVisible) {
      const offset = this.isVisible ? 1 : -1
      for (const { outerSide } of this.octant.neighbors) {
        this.parent.sides[outerSide.index].adjustVisibleCount(offset)
      }
    }
    this.parent.fuse()
  }

  get moctree () {
    return this.level.moctree
  }

  // get siblings () {
  //   return this.parent.subs
  // }

  get depth () {
    return this.level.depth
  }

  get isTln () {
    return !this.parent
  }

  get isLeaf () {
    return this.subs.length === 0
  }

  get isVisible () {
    return this.material_ !== undefined
  }

  split () {
    if (!this.isLeaf) return this
    if (this.parent) --this.parent.subLeafCount
    this.subLeafCount = 8
    const subLevel = this.level.obtainChild()
    for (let i = 0; i < 8; ++i) this.subs.push(new MoctNode(subLevel, this, moctOctants[i]))
    for (let i = 0; i < 8; ++i) {
      const sub = this.subs[i]
      for (const { outerSide, octantNei } of sub.octant.neighbors) {
        const subSide = sub.sides[outerSide.index]
        subSide.parent = this.sides[outerSide.index]
        const gedCon = this.sides[outerSide.index].gedCon
        if (gedCon) {
          const nodeNei = gedCon.node
          if (nodeNei.isLeaf) {
            subSide.gedCon = gedCon
          } else {
            const subSideNei = nodeNei.subs[octantNei.index].sides[outerSide.complement.index]
            subSide.gedCon = subSideNei
            subSideNei.gedCon = subSide
          }
        }
      }
      for (const { innerSide, octantNei } of sub.octant.neighbors) {
        sub.sides[innerSide.index].gedCon = this.subs[octantNei.index].sides[innerSide.complement.index]
      }
    }
    return this
  }

  fuse () {
    if (this.isLeaf || this.subLeafCount < 8) return this

    let commonMaterial = this.subs[0].material
    for (let i = 1; i < 8; ++i) {
      const sub = this.subs[i]
      if (commonMaterial !== sub.material) return this
    }

    // TODO: Proper shape merging
    let commonShape = this.subs[0].shape
    for (let i = 1; i < 8; ++i) {
      const sub = this.subs[i]
      if (commonShape !== sub.shape) return this
    }

    this.level.child.clean(8)
    this.subs.length = 0
    for (const side of this.sides) side.reset()
    if (this.parent) ++this.parent.subLeafCount
    this.shape = commonShape
    this.setNewMaterial(commonMaterial)
    return this
  }
}
