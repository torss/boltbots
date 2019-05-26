/**
 * Aka the board.
 */
export class Map {
  constructor (tiMa) {
    this.tiMa = tiMa
  }

  remesh (scene) {
    for (const mesh of Object.values(this.tiMa.remesh())) {
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }
}
