import * as THREE from 'three'

THREE.Camera.prototype.getWorldNormals = function (up = new THREE.Vector3(), side = new THREE.Vector3(), direction = new THREE.Vector3()) {
  this.updateMatrixWorld(true)
  const e = this.matrixWorld.elements
  up.set(e[0], e[1], e[2]).normalize()
  side.set(e[4], e[5], e[6]).normalize()
  direction.set(-e[8], -e[9], -e[10]).normalize()
  return {up, side, direction}
}
