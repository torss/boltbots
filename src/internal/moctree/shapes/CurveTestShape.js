import * as THREE from 'three'

export class CurveTestShape {
  constructor () {
    this.maxBevelSegments = 8
    this.flatLengths = new THREE.Vector2(0.5, 0.5)
  }

  meshNode (moctNode, origin, indices, positions, normals) {
    const level = moctNode.level
    const scale = level.scaleHalf
    const curveScale = level.scale
    const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 0.5 * Math.PI, false, 0)
    const ilen = this.maxBevelSegments
    const iinv = 1 / ilen
    const flatLengths = this.flatLengths
    const invFlatLengths = new THREE.Vector2(1, 1).sub(this.flatLengths)
    let indexLoopLength = 1
    const pushVerts = (curveT, modPos) => {
      const curvePoint = new THREE.Vector2()
      const position0 = new THREE.Vector3()
      const position1 = new THREE.Vector3()
      const normal = new THREE.Vector3()
      curve.getPoint(curveT, curvePoint)
      position0.copy(origin).subScalar(scale)
      modPos(position0, curvePoint)
      position1.set(position0.x, position0.y, origin.z + scale)
      normal.x = curvePoint.x
      normal.y = curvePoint.y
      normal.z = 0
      positions.pushVector3(position0, position1)
      normals.pushVector3(normal, normal)
    }
    const pushVertsStartEnd = (curveT) => {
      indexLoopLength += iinv
      pushVerts(curveT, (position0, curvePoint) => {
        position0.x += curveScale * curvePoint.x
        position0.y += curveScale * curvePoint.y
      })
    }
    if (flatLengths.y > 0) pushVertsStartEnd(0)
    for (let i = 0; i <= 1; i += iinv) {
      pushVerts(i, (position0, curvePoint) => {
        position0.x += curveScale * (flatLengths.x + invFlatLengths.x * curvePoint.x)
        position0.y += curveScale * (flatLengths.y + invFlatLengths.y * curvePoint.y)
      })
    }
    if (flatLengths.x > 0) pushVertsStartEnd(1)
    for (let i = 0; i < indexLoopLength; i += iinv) indices.pushRelativeWithOffset(i === 0 ? 0 : -2, 2, 1, 0, 2, 3, 1)
  }
}

export const curveTestShape = new CurveTestShape()
