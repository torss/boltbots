import * as THREE from 'three'

THREE.Object3D.prototype.traverseControlled = function (func) {
  if (!func(this)) return
  const children = this.children
  for (let i = 0, l = children.length; i < l; ++i) {
    children[i].traverseControlled(func)
  }
}

THREE.Object3D.prototype.removeSelf = function () {
  if (this.parent) this.parent.remove(this)
}
