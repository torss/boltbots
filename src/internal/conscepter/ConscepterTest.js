/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import '../extensions/three'
import {BufferAttributeExt, BufferAttributeExtIndex} from '../extensions'

export function conscepterTest (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  const bufferSet = new BufferSet()
  testConstruct(bufferSet)
  const mesh = new THREE.Mesh(bufferSet.fitSize().createGeometry(), material)
  scene.add(mesh)
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff2200,
    metalness: 0.95,
    roughness: 0.05,
    envMap: material.envMap,
    envMapIntensity: 1
  })
  const meshWire = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), material2)
  scene.add(meshWire)
}

class BufferSet {
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

function testConstruct (bufferSet) {
  const csBox = new CsBox()
  // csBox.rotation.makeRotationFromEuler(new THREE.Euler(0.25 * Math.PI, 0.25 * Math.PI, 0.25 * Math.PI, 'XYZ'))
  csBox.rotation.makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), 0.5 * Math.PI))
  csBox.addToBufferSet(bufferSet)
}

class CsBox {
  constructor (center, halfSize) {
    this.center = new THREE.Vector3()
    this.halfSize = new THREE.Vector3(0.5, 0.5, 0.5)
    this.rotation = new THREE.Matrix3()
    if (center) this.center.copy(center)
    if (halfSize) this.halfSize.copy(halfSize)
  }

  addToBufferSet (bufferSet) {
    function addFace ({index, position, normal, color}, n0, p0, p1, p2, p3) {
      index.pushRelative(0, 1, 2, 1, 3, 2) // TODO upushRelative
      position.upushVector3(p0, p1, p2, p3)
      normal.upushVector3(n0, n0, n0, n0)
      const testColor = new THREE.Vector3(1, 0, 0)
      color.upushVector3(testColor, testColor, testColor, testColor)
    }
    const hs = this.halfSize
    const point0 = new THREE.Vector3(+hs.x, +hs.y, +hs.z).applyMatrix3(this.rotation)
    const point1 = new THREE.Vector3(-hs.x, +hs.y, +hs.z).applyMatrix3(this.rotation)
    const point2 = new THREE.Vector3(+hs.x, -hs.y, +hs.z).applyMatrix3(this.rotation)
    const point3 = new THREE.Vector3(-hs.x, -hs.y, +hs.z).applyMatrix3(this.rotation)
    const point4 = new THREE.Vector3(-point3.x, -point3.y, -point3.z)
    const point5 = new THREE.Vector3(-point2.x, -point2.y, -point2.z)
    const point6 = new THREE.Vector3(-point1.x, -point1.y, -point1.z)
    const point7 = new THREE.Vector3(-point0.x, -point0.y, -point0.z)
    const faceCount = 6
    const vertexCount = 4 * faceCount
    bufferSet.forEachNonIndex((buffer) => buffer.padSize(buffer.countCurrent + vertexCount)) // TODO index
    addFace(bufferSet, new THREE.Vector3(0, 0, +1), point0, point1, point2, point3)
    addFace(bufferSet, new THREE.Vector3(0, 0, -1), point6, point7, point4, point5)
    addFace(bufferSet, new THREE.Vector3(0, +1, 0), point4, point5, point0, point1)
    addFace(bufferSet, new THREE.Vector3(0, -1, 0), point2, point3, point6, point7)
    addFace(bufferSet, new THREE.Vector3(+1, 0, 0), point2, point6, point0, point4)
    addFace(bufferSet, new THREE.Vector3(-1, 0, 0), point1, point5, point3, point7)

    // function addScaled (a, b, s) {
    //   a.x = b.x * s.x
    //   a.y = b.y * s.y
    //   a.z = b.z * s.z
    //   return a
    // }
    // index.pushRelative(0, 1, 2, 1, 3, 2)
    // const pos = new THREE.Vector3()
    // pos.copy(this.center)
    // position.padSize(position.countCurrent + 4)
    // position.upushVector3(addScaled(pos, this.halfSize, new THREE.Vector3(+1, +1, 1)))
    // position.upushVector3(addScaled(pos, this.halfSize, new THREE.Vector3(-1, +1, 1)))
    // position.upushVector3(addScaled(pos, this.halfSize, new THREE.Vector3(+1, -1, 1)))
    // position.upushVector3(addScaled(pos, this.halfSize, new THREE.Vector3(-1, -1, 1)))
    // const testNormal = new THREE.Vector3(1, 0, 0)
    // normal.pushVector3(testNormal, testNormal, testNormal, testNormal)
    // const testColor = new THREE.Vector3(1, 0, 0)
    // color.pushVector3(testColor, testColor, testColor, testColor)
  }
}
