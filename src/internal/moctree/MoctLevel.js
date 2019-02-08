/**
 * @author torss / https://github.com/torss
 *
 * MoctLevel
 */

/**
 * Moctree general Level info
 */
export class MoctLevel {
  constructor (moctree, parent, child) {
    this.moctree = moctree
    this.parent = parent
    this.child = child
    this.counter = 0
    this.update()
  }

  update () {
    const parent = this.parent
    if (parent) {
      this.depth = parent.depth + 1
      this.scale = parent.scaleHalf
    } else {
      this.counter = 1
      this.depth = 0
      this.scale = this.moctree.scale
    }
    this.scaleHalf = this.scale / 2
    // this.scaleQuarter = this.scale / 4
    if (this.child) this.child.update()
    else this.moctree.lowestLevel = this
  }

  obtainChild () {
    if (!this.child) this.child = new MoctLevel(this.moctree, this)
    return this.child
  }

  clean (count) {
    this.counter -= count
    if (this.counter <= 0 && !this.child && this.parent) this.parent.child = undefined
  }
}
