import * as THREE from 'three'

export class CurveTestShape {
  meshNode (moctNode, origin, indices, positions, normals) {
    const level = moctNode.level
    const scale = level.scaleHalf
    const curveScale = level.scale
    const curve = new THREE.EllipseCurve(0, 0, 1, 1, 0, 0.5 * Math.PI, false, 0)
    const ilen = 8
    const iinv = 1 / ilen
    const points = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    const pointNormals = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
    const toPosition = (curvePoint, index, depth) => {
      const point = points[index]
      point.x = origin.x - scale + curveScale * curvePoint.x
      point.y = origin.y - scale + curveScale * curvePoint.y
      point.z = origin.z + depth
      const normal = pointNormals[index]
      normal.x = curvePoint.x
      normal.y = curvePoint.y
      normal.z = 0
    }
    for (let i = 0; i < 1; i += iinv) {
      const p0 = curve.getPoint(i)
      const p1 = curve.getPoint(i + iinv)
      toPosition(p1, 0, -scale)
      toPosition(p1, 1, +scale)
      toPosition(p0, 2, -scale)
      toPosition(p0, 3, +scale)
      indices.pushRelative(0, 1, 2, 1, 3, 2)
      positions.pushVector3(points[0], points[1], points[2], points[3])
      normals.pushVector3(pointNormals[0], pointNormals[1], pointNormals[2], pointNormals[3]) // TODO only need two
    }
  }
}

export const curveTestShape = new CurveTestShape()
