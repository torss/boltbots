/**
 * @author torss / https://github.com/torss
 *
 * MoctNodeSide
 */

/**
 * Moctree Node Side
 */
export class MoctNodeSide {
  constructor (moctNode, moctCubeSide) {
    this.node = moctNode
    this.cubeSide = moctCubeSide
    this.parent = undefined
    this.gedCon = undefined // "Greater-equal-depth" connection (this.depth <= other.depth) - A complementing MoctNodeSide or undefined
    this.reset()
  }

  reset () {
    this.visibleCount = 4
  }

  adjustVisibleCount (offset) {
    const hadFullFace = this.fullFace
    this.visibleCount += offset
    if (hadFullFace !== this.fullFace && this.parent) {
      this.parent.adjustVisibleCount(offset)
    }
  }

  get fullFace () {
    return this.node.isLeaf || this.visibleCount === 4
  }

  get isVisible () {
    return this.node.isVisible && (!this.gedCon || !this.gedCon.node.isVisible || !this.gedCon.fullFace)
  }
}
