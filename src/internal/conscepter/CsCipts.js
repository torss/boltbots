import * as THREE from 'three'

export class CsCipts {
  constructor () {
    this.pts = []
    this.size = 0
    this.index = 0
  }

  resize (size) {
    this.size = size
    if (size <= this.pts.length) return this
    for (let i = 0; i < size; ++i) this.pts[i] = new THREE.Vector3()
    return this
  }

  push (vec3) {
    this.pts[this.index++].copy(vec3)
  }

  gen (size) {
    if (this.size === size) return this
    this.resize(size)
    this.index = 0
    const step = 2 * Math.PI / size
    for (let i = 0, j = 0; j < size; i += step, ++j) {
      this.push(new THREE.Vector3(Math.cos(i), Math.sin(i), 0))
    }
    return this
  }
}
