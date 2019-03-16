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
  const csBox = new CsBox(undefined, new THREE.Vector3(0.5, 0.25, 0.5))
  // csBox.rotation.makeRotationFromEuler(new THREE.Euler(0.25 * Math.PI, 0.25 * Math.PI, 0.25 * Math.PI, 'XYZ'))
  // csBox.rotation.makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 1).normalize(), 0.5 * Math.PI))
  function attachRectRoof (csQuad, flip = false, distance = 1, offset = 0) {
    const csRectRoof = new CsRectRoof(csQuad, flip, distance, offset)
    csQuad.attachment = csRectRoof
    csQuad.visible = false
    return csRectRoof
  }
  // attachRectRoof(attachRectRoof(csBox.quads[0]).quads[0], true, 0.25)
  // attachRectRoof(csBox.quads[2], true, 0.25)
  attachRectRoof(attachRectRoof(csBox.quads[0], false, 0.5, -0.25).quads[1], false, 0.1)
  attachRectRoof(csBox.quads[1], false, 0.25, 0.5)
  csBox.addToBufferSet(bufferSet)
}

function addQuad ({index, position, normal, color}, n0, p0, p1, p2, p3) {
  index.pushRelative(0, 1, 2, 1, 3, 2) // TODO upushRelative
  position.upushVector3(p0, p1, p2, p3)
  normal.upushVector3(n0, n0, n0, n0)
  const testColor = new THREE.Vector3(1, 0, 0)
  color.upushVector3(testColor, testColor, testColor, testColor)
}

function addTri ({index, position, normal, color}, n0, p0, p1, p2) {
  index.pushRelative(0, 1, 2) // TODO upushRelative
  position.upushVector3(p0, p1, p2)
  normal.upushVector3(n0, n0, n0)
  const testColor = new THREE.Vector3(1, 0, 0)
  color.upushVector3(testColor, testColor, testColor)
}

class CsQuad {
  constructor (points, normal) {
    this.points = points
    this.normal = normal
    this.visible = true
    this.attachment = undefined
  }

  addToBufferSet (bufferSet) {
    addQuad(bufferSet, this.normal, this.points[0], this.points[1], this.points[2], this.points[3])
  }

  addAttachmentToBufferSet (bufferSet) {
    if (this.attachment) this.attachment.addToBufferSet(bufferSet, this)
  }
}

class CsTri {
  constructor (points, normal) {
    this.points = points
    this.normal = normal
    this.visible = true
    this.attachment = undefined
  }

  addToBufferSet (bufferSet) {
    addTri(bufferSet, this.normal, this.points[0], this.points[1], this.points[2])
  }

  addAttachmentToBufferSet (bufferSet) {
    if (this.attachment) this.attachment.addToBufferSet(bufferSet, this)
  }
}

class CsBox {
  constructor (center, halfSize) {
    this.center = new THREE.Vector3()
    this.halfSize = new THREE.Vector3(0.5, 0.5, 0.5)
    this.rotation = new THREE.Matrix3()
    if (center) this.center.copy(center)
    if (halfSize) this.halfSize.copy(halfSize)
    this.computeQuads()
  }

  computeQuads () {
    const hs = this.halfSize
    const point0 = new THREE.Vector3(+hs.x, +hs.y, +hs.z).applyMatrix3(this.rotation)
    const point1 = new THREE.Vector3(-hs.x, +hs.y, +hs.z).applyMatrix3(this.rotation)
    const point2 = new THREE.Vector3(+hs.x, -hs.y, +hs.z).applyMatrix3(this.rotation)
    const point3 = new THREE.Vector3(-hs.x, -hs.y, +hs.z).applyMatrix3(this.rotation)
    const point4 = new THREE.Vector3(-point3.x, -point3.y, -point3.z)
    const point5 = new THREE.Vector3(-point2.x, -point2.y, -point2.z)
    const point6 = new THREE.Vector3(-point1.x, -point1.y, -point1.z)
    const point7 = new THREE.Vector3(-point0.x, -point0.y, -point0.z)
    const normal0 = new THREE.Vector3(0, 0, 1).applyMatrix3(this.rotation)
    const normal1 = new THREE.Vector3(-normal0.x, -normal0.y, -normal0.z)
    const normal2 = new THREE.Vector3(0, 1, 0).applyMatrix3(this.rotation)
    const normal3 = new THREE.Vector3(-normal2.x, -normal2.y, -normal2.z)
    const normal4 = new THREE.Vector3(1, 0, 0).applyMatrix3(this.rotation)
    const normal5 = new THREE.Vector3(-normal4.x, -normal4.y, -normal4.z)
    this.quads = [
      new CsQuad([point0, point1, point2, point3], normal0),
      new CsQuad([point6, point7, point4, point5], normal1),
      new CsQuad([point4, point5, point0, point1], normal2),
      new CsQuad([point2, point3, point6, point7], normal3),
      new CsQuad([point2, point6, point0, point4], normal4),
      new CsQuad([point1, point5, point3, point7], normal5)
    ]
  }

  addToBufferSet (bufferSet) {
    let quadCount = 0
    for (let i = 0; i < 6; ++i) {
      if (this.quads[i].visible) ++quadCount
    }
    const vertexCount = 4 * quadCount
    bufferSet.forEachNonIndex((buffer) => buffer.padSize(buffer.countCurrent + vertexCount)) // TODO index
    for (let i = 0; i < 6; ++i) if (this.quads[i].visible) this.quads[i].addToBufferSet(bufferSet)
    for (let i = 0; i < 6; ++i) this.quads[i].addAttachmentToBufferSet(bufferSet)
  }
}

class CsRectRoof {
  constructor (csQuad, flip = false, distance = 1, offset = 0) {
    this.flip = flip
    this.distance = distance
    this.offset = offset
    this.computeFaces(csQuad)
  }

  computeFaces (csQuad) {
    let p0, p1, p2, p3
    if (this.flip) {
      p0 = csQuad.points[1]
      p1 = csQuad.points[3]
      p2 = csQuad.points[0]
      p3 = csQuad.points[2]
    } else {
      p0 = csQuad.points[0]
      p1 = csQuad.points[1]
      p2 = csQuad.points[2]
      p3 = csQuad.points[3]
    }
    const n0 = csQuad.normal
    const offset = this.offset + 0.5
    const m0 = new THREE.Vector3().lerpVectors(p0, p2, offset).addScaledVector(n0, this.distance)
    const m1 = new THREE.Vector3().lerpVectors(p1, p3, offset).addScaledVector(n0, this.distance)
    const span0 = new THREE.Vector3().subVectors(p0, p1)
    const span1 = new THREE.Vector3().subVectors(p0, m0)
    const span2 = new THREE.Vector3().subVectors(m0, m1)
    const span3 = new THREE.Vector3().subVectors(m0, p2)
    this.quads = [
      new CsQuad([p0, p1, m0, m1], new THREE.Vector3().crossVectors(span0, span1).normalize()),
      new CsQuad([m0, m1, p2, p3], new THREE.Vector3().crossVectors(span2, span3).normalize())
    ]
    const n1 = new THREE.Vector3().crossVectors(span1, span3).normalize()
    this.tris = [
      new CsTri([p0, m0, p2], n1),
      new CsTri([p3, m1, p1], n1.clone().negate())
    ]
  }

  addToBufferSet (bufferSet, csQuad) {
    let quadCount = 0
    let triCount = 0
    for (let i = 0; i < 2; ++i) {
      if (this.quads[i].visible) ++quadCount
      if (this.tris[i].visible) ++triCount
    }
    const vertexCount = 4 * quadCount + 3 * triCount
    bufferSet.forEachNonIndex((buffer) => buffer.padSize(buffer.countCurrent + vertexCount)) // TODO index
    for (let i = 0; i < 2; ++i) {
      if (this.quads[i].visible) this.quads[i].addToBufferSet(bufferSet)
      if (this.tris[i].visible) this.tris[i].addToBufferSet(bufferSet)
    }
    for (let i = 0; i < 2; ++i) {
      this.quads[i].addAttachmentToBufferSet(bufferSet)
      this.tris[i].addAttachmentToBufferSet(bufferSet)
    }
    // addQuad(bufferSet, new THREE.Vector3().crossVectors(span0, span1).normalize(), p0, p1, m0, m1)
    // addQuad(bufferSet, new THREE.Vector3().crossVectors(span2, span3).normalize(), m0, m1, p2, p3)
    // const n1 = new THREE.Vector3().crossVectors(span1, span3).normalize()
    // addTri(bufferSet, n1, p0, m0, p2)
    // addTri(bufferSet, n1.negate(), p3, m1, p1)
  }
}
