import * as THREE from 'three'

THREE.Vector3.prototype.pushOnto = function (array) {
  array.push(this.x, this.y, this.z)
}

THREE.Vector3.prototype.addScalars = function (x, y, z) {
  this.x += x
  this.y += y
  this.z += z
  return this
}

THREE.Vector3.prototype.multiplyScalars = function (x, y, z) {
  this.x *= x
  this.y *= y
  this.z *= z
  return this
}

THREE.Vector3.prototype.applyFunction = function (func) {
  this.x = func({vector: this, value: this.x, axis: 'x', index: 0})
  this.y = func({vector: this, value: this.y, axis: 'y', index: 1})
  this.z = func({vector: this, value: this.z, axis: 'z', index: 2})
  return this
}

THREE.Vector3.prototype.swapTwoAxes = function (axisA, axisB) {
  const tmpA = this[axisA]
  this[axisA] = this[axisB]
  this[axisB] = tmpA
  return this
}

THREE.Vector3.prototype.isWithinOriginCube = function (cubeHalfSideLength) {
  return this.x <= cubeHalfSideLength && this.x >= -cubeHalfSideLength &&
    this.y <= cubeHalfSideLength && this.y >= -cubeHalfSideLength &&
    this.z <= cubeHalfSideLength && this.z >= -cubeHalfSideLength
}

THREE.Vector3.prototype.abs = function () {
  this.x = Math.abs(this.x)
  this.y = Math.abs(this.y)
  this.z = Math.abs(this.z)
  return this
}

THREE.Vector3.prototype.redivScalar = function (scalar = 1) {
  this.x = scalar / this.x
  this.y = scalar / this.y
  this.z = scalar / this.z
  return this
}

THREE.Vector3.prototype.rsub = function (v) {
  this.x = v.x - this.x
  this.y = v.y - this.y
  this.z = v.z - this.z
  return this
}
