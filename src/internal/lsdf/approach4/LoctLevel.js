// Currently almost identical to MoctLevel
export class LoctLevel {
  constructor (loctTree, parent, child) {
    this.loctTree = loctTree
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
      this.scale = this.loctTree.scale
    }
    this.scaleHalf = this.scale / 2
    // this.scaleQuarter = this.scale / 4
    this.diagonalHalf = Math.sqrt(this.scaleHalf * this.scaleHalf * 3)
    if (this.child) this.child.update()
    else this.loctTree.lowestLevel = this
  }

  obtainChild () {
    if (!this.child) this.child = new LoctLevel(this.loctTree, this)
    return this.child
  }

  clean (count) {
    this.counter -= count
    if (this.counter <= 0 && !this.child && this.parent) this.parent.child = undefined
  }
}
