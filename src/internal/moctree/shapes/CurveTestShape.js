import * as THREE from 'three'

export class CurveTestShape {
  meshNode (moctNode, origin, indices, positions, normals) {
    const level = moctNode.level
    const scale = level.scaleHalf
    const curveScale = level.scale
    const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 0.5 * Math.PI, false, 0)
    const ilen = 8
    const iinv = 1 / ilen
    for (let i = 0; i <= 1; i += iinv) {
      const curvePoint = new THREE.Vector2()
      const position0 = new THREE.Vector3()
      const position1 = new THREE.Vector3()
      const normal = new THREE.Vector3()
      curve.getPoint(i, curvePoint)
      position0.x = origin.x - scale + curveScale * curvePoint.x
      position0.y = origin.y - scale + curveScale * curvePoint.y
      position0.z = origin.z - scale
      position1.x = position0.x
      position1.y = position0.y
      position1.z = origin.z + scale
      normal.x = curvePoint.x
      normal.y = curvePoint.y
      normal.z = 0
      positions.pushVector3(position0, position1)
      normals.pushVector3(normal, normal)
    }
    for (let i = 0; i < 1; i += iinv) indices.pushRelativeWithOffset(i === 0 ? 0 : -2, 2, 1, 0, 2, 3, 1)
  }
}

export const curveTestShape = new CurveTestShape()
