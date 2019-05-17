import * as THREE from 'three'

export class CsPipeCmd {
  constructor () {
    this.type = ''
  }

  makeBase (position = new THREE.Vector3(0, 0, 0), rotation = new THREE.Matrix3(), normal = undefined) {
    this.type = 'base'
    this.position = position
    this.normal = normal || new THREE.Vector3(0, 1, 0).applyMatrix3(rotation)
    this.rotation = rotation
    return this
  }

  makeRadius (radius) {
    this.type = 'radius'
    this.radius = radius
    return this
  }

  makeLength (length) {
    this.type = 'length'
    this.length = length
    return this
  }
}

export class CsPipe {
  constructor (segments = 32) {
    this.curPosition = new THREE.Vector3()
    this.curNormal = new THREE.Vector3(0, 1, 0)
    this.curRotation = new THREE.Matrix3()
    this.curLength = 1
    this.curSegments = segments // ! TODO LOD etc.
    this.curRadius = -1
    this.step = 0
  }

  runCmds (csBuf, cmds) {
    for (const cmd of cmds) this.runCmd(csBuf, cmd)
  }

  runCmd (csBuf, cmd) {
    switch (cmd.type) {
      case 'base':
        this.curPosition.copy(cmd.position)
        this.curNormal.copy(cmd.normal)
        this.curRotation.copy(cmd.rotation)
        this.compCircleBase(csBuf)
        this.compCircleBaseRotated(csBuf)
        break
      case 'length':
        this.curLength = cmd.length
        break
      case 'radius': {
        if (this.step >= 1) this.curPosition.addScaledVector(this.curNormal, this.curLength)
        this.curRadius = cmd.radius
        this.compCirclePoints(csBuf)
        if (this.step >= 1) this.constructLateralFaces(csBuf)
        const ciptsTmp = csBuf.ciptsTmp0
        csBuf.ciptsTmp0 = csBuf.ciptsTmp1
        csBuf.ciptsTmp1 = ciptsTmp
        ++this.step
      } break
    }
  }

  compCircleBase (csBuf) {
    const { curSegments } = this
    const { ciptsBase, ciptsTmp0, ciptsTmp1, ciptsTmp2 } = csBuf
    ciptsBase.gen(curSegments)
    ciptsTmp0.resize(curSegments)
    ciptsTmp1.resize(curSegments)
    ciptsTmp2.resize(curSegments)
    for (let i = 0; i < ciptsBase.size; ++i) {
      const basePoint = ciptsBase.pts[i]
      basePoint.swizzle('x', 'z', 'y')
    }
  }

  compCircleBaseRotated (csBuf) {
    const { curRotation } = this
    const { ciptsBase, ciptsTmp2 } = csBuf
    for (let i = 0; i < ciptsBase.size; ++i) {
      const basePoint = ciptsBase.pts[i]
      ciptsTmp2.pts[i].copy(basePoint).applyMatrix3(curRotation)
    }
  }

  compCirclePoints (csBuf) {
    const { curPosition, curRadius } = this
    const { ciptsTmp1, ciptsTmp2 } = csBuf
    for (let i = 0; i < ciptsTmp2.size; ++i) {
      const basePoint = ciptsTmp2.pts[i]
      ciptsTmp1.pts[i].copy(basePoint).multiplyScalar(curRadius).add(curPosition)
    }
  }

  constructLateralFaces (csBuf) {
    const { ciptsTmp0, ciptsTmp1, ciptsTmp2, bufferSet } = csBuf
    const { index, position, normal, color } = bufferSet

    const segments = ciptsTmp1.size
    const vertexCount = segments * 4
    bufferSet.forEachNonIndex((buffer) => buffer.padSize(buffer.countCurrent + vertexCount)) // TODO index

    for (let i = 0; i < segments; ++i) {
      const p0 = ciptsTmp0.pts[i]
      const p1 = ciptsTmp1.pts[i]
      const cylNormal = ciptsTmp2.pts[i]
      const span0 = new THREE.Vector3().subVectors(p1, p0)
      const n0 = new THREE.Vector3().crossVectors(span0, cylNormal).cross(span0).normalize()
      position.upushVector3(p0, p1)
      normal.upushVector3(n0, n0)
      const testColor = new THREE.Vector3(1, 0, 0)
      color.upushVector3(testColor)
    }

    const sio = index.highestStoredIndex + 1
    let io = sio
    for (let i = 1; i < segments; ++i, io += 2) index.pushWithOffset(io, 0, 1, 2, 1, 3, 2) // TODO upushWithOffset
    index.pushWithOffset(0, io, io + 1, sio, io + 1, sio + 1, sio)
  }
}
