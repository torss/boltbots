import '../extensions/three/Object3D'
import { Sides } from './Sides'

/**
 * Tile Shape
 */
export class TiSh {
  constructor (obj) {
    this.sides = new Sides(() => ({
      shapes: [],
      partial: true
    }))
    obj.traverseControlled(obj => {
      if (obj.visible === false) return false
      if (this.sides[obj.name]) {
        const side = this.sides[obj.name]
        obj.traverseControlled(obj => {
          if (!obj.userData.partial) side.partial = false
          const always = !!obj.userData.always
          side.shapes.push({ geometry: obj.geometry, materialKey: 'default', always })
        })
        return false
      }
      return true
    })
  }
}
