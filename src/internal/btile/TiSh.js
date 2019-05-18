import '../extensions/three/Object3D'
import { Sides } from './Sides'

/**
 * Tile Shape
 */
export class TiSh {
  constructor (obj) {
    this.sides = new Sides(() => [])
    obj.traverseControlled(obj => {
      if (obj.visible === false) return false
      if (this.sides[obj.name]) {
        const side = this.sides[obj.name]
        obj.traverseControlled(obj => side.push({ geometry: obj.geometry, materialKey: 'default' }))
        return false
      }
      return true
    })
  }
}
