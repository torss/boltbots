/**
 * @author torss / https://github.com/torss
 *
 * MoctMesher
 */

import * as THREE from 'three'
import {BufferAttributeExt} from '../extensions/three'

// import {moctCubeSides} from './MoctCubeSide'
import {MoctIterTtb} from './iterators'

/**
 * Moctree mesher
 */
export class MoctMesher {
  constructor (moctree) {
    this.moctree = moctree
  }

  mesh () {
    const moctree = this.moctree
    const geometry = new THREE.BufferGeometry()
    // TODO Use indices
    const positions = new BufferAttributeExt(new Float32Array(0), 3)
    const normals = new BufferAttributeExt(new Float32Array(0), 3)
    for (let iterTtb = new MoctIterTtb(moctree.tln); iterTtb.next();) {
      const moctNode = iterTtb.node
      const origin = iterTtb.origin
      this.meshNode(moctNode, origin, positions, normals)
    }
    geometry.addAttribute('position', positions.fitSize())
    geometry.addAttribute('normal', normals.fitSize())
    return geometry
  }

  meshNode (moctNode, origin, positions, normals) {
    // const pushFace = (origin, scale, moctCubeSide) => {
    //   const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
    //   positions.pushVector3(points[0], points[1], points[2], points[1], points[3], points[2])
    //   const normal = moctCubeSide.normal
    //   normals.pushVector3(normal, normal, normal, normal, normal, normal)
    // }
    if (moctNode.material === undefined) return
    const level = moctNode.level
    const scale = level.scaleHalf
    // moctCubeSides.forEach(moctCubeSide => {
    //   const side = moctNode.sides[moctCubeSide.index]
    //   if (side.isVisible) pushFace(origin, scale, moctCubeSide)
    // })

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
      positions.pushVector3(points[0], points[1], points[2], points[1], points[3], points[2])
      normals.pushVector3(pointNormals[0], pointNormals[1], pointNormals[2], pointNormals[1], pointNormals[3], pointNormals[2]) // TODO only need two
    }
  }
}
