// Slightly modified version of the original
// https://github.com/mrdoob/three.js/blob/159a40648ee86755220491d4f0bae202235a341c/examples/jsm/postprocessing/Pass.js

import * as THREE from 'three'

export class FullScreenQuad {
  constructor (material) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const geometry = new THREE.PlaneBufferGeometry(2, 2)
    this._mesh = new THREE.Mesh(geometry, material)
  }

  get material () { return this._mesh.material }
  set material (value) { this._mesh.material = value }

  render (renderer) {
    renderer.render(this._mesh, this.camera)
  }
}
