import '../extensions/three/Object3D'
import { Sides } from './Sides'

/**
 * Tile Shape
 */
export class TiSh {
  constructor (obj) {
    this.sides = new Sides(() => ({
      shapes: [],
      partialFull: true,
      partialStart: 1,
      partialEnd: 0
    }))
    obj.traverseControlled(obj => {
      if (obj.visible === false) return false
      if (this.sides[obj.name]) {
        const side = this.sides[obj.name]
        obj.traverseControlled(obj => {
          const userData = obj.userData
          if (!userData.partial) side.partialFull = false
          if (userData.partialStart < side.partialStart) side.partialStart = userData.partialStart
          if (userData.partialEnd > side.partialEnd) side.partialEnd = userData.partialEnd
          const always = !!userData.always
          side.shapes.push({ geometry: obj.geometry, materialKey: 'default', always })
        })
        return false
      }
      return true
    })
  }
}
