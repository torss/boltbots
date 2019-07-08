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
          side.shapes.push(new Shape(obj))
          return true
        })
        return false
      }
      return true
    })
  }
}

class Shape {
  constructor (obj) {
    const userData = obj.userData
    this.geometries = {
      'X+': obj.geometry,
      'X-': undefined,
      'Z+': undefined,
      'Z-': undefined
    }
    this.materialKey = 'default'
    this.always = !!userData.always
  }

  get geometry () {
    return this.geometries['X+']
  }

  obtainGeometry (rotation) {
    const { geometries } = this
    rotation = rotation || 'X+'
    if (!geometries[rotation]) {
      switch (rotation) {
        case 'X-':
          geometries[rotation] = this.geometry.clone().rotateY(Math.PI)
          break
        case 'Z+':
          geometries[rotation] = this.geometry.clone().rotateY(Math.PI * 1.5)
          break
        case 'Z-':
          geometries[rotation] = this.geometry.clone().rotateY(Math.PI * 0.5)
          break
        default:
          console.error('Shape.obtainGeometry: Not implemented for ' + rotation)
      }
    }
    return geometries[rotation]
  }
}
