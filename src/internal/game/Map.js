import * as THREE from 'three'

/**
 * Aka the board.
 */
export class Map {
  constructor (tiMa) {
    this.tiMa = tiMa
    this.groundHeight = 0
  }

  remesh (scene) {
    for (const mesh of Object.values(this.tiMa.remesh())) {
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }

  getTiEnAt (position) {
    const { dim, tiEns } = this.tiMa
    const pos = new THREE.Vector3().copy(position).floor()
    if (!dim.check(pos)) return undefined
    const index = dim.resolve(pos)
    return tiEns[index]
  }

  checkObstacle (position, bot) {
    const tiEn = this.getTiEnAt(position)
    if (tiEn) return (tiEn.entity !== bot && tiEn.entity) || (tiEn.tiTy.wall && 'wall')
  }

  enterBot (position, bot) {
    const tiEn = this.getTiEnAt(position)
    if (tiEn) {
      tiEn.visited = true
      if (tiEn.entity === undefined && tiEn.entity !== bot) {
        tiEn.entity = bot
        if (bot) bot.tiEns.push(tiEn)
      }
    }
  }
}
