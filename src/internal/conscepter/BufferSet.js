import * as THREE from 'three'
import {BufferAttributeExt, BufferAttributeExtIndex} from '../extensions'

export class BufferSet {
  constructor () {
    this.index = new BufferAttributeExtIndex()
    this.position = new BufferAttributeExt(new Float32Array(), 3)
    this.normal = new BufferAttributeExt(new Float32Array(), 3)
    this.color = new BufferAttributeExt(new Float32Array(), 3)
  }

  forEachNonIndex (func) {
    func(this.position, 'position')
    func(this.normal, 'normal')
    func(this.color, 'color')
    return this
  }

  forEach (func) {
    func(this.index, 'index')
    return this.forEachNonIndex(func)
  }

  addAttributes (geometry) {
    geometry.setIndex(this.index)
    return this.forEachNonIndex((buffer, key) => geometry.addAttribute(key, buffer))
  }
  setDynamic (value) { return this.forEach((buffer) => buffer.setDynamic(value)) }
  fitSize (markForUpdate = true) { return this.forEach((buffer) => buffer.fitSize(markForUpdate)) }
  clear (resize = false) { return this.forEach((buffer) => buffer.clear(resize)) }

  createGeometry () {
    const geometry = new THREE.BufferGeometry()
    this.addAttributes(geometry)
    return geometry
  }
}
