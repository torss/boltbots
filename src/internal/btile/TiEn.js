/**
 * Tile Entity
 */
export class TiEn {
  constructor (tiTy) {
    this.tiTy = tiTy
    this.rotation = undefined

    // Game-specific
    this.entity = undefined
    this.visited = false

    this.special = undefined // Currently only for checkpoints
  }
}
