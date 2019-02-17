import {moctCubeSides} from '../MoctCubeSide'

export class CubeShape {
  meshNode (moctNode, origin, positions, normals) {
    const pushFace = (origin, scale, moctCubeSide) => {
      const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
      positions.pushVector3(points[0], points[1], points[2], points[1], points[3], points[2])
      const normal = moctCubeSide.normal
      normals.pushVector3(normal, normal, normal, normal, normal, normal)
    }
    const level = moctNode.level
    const scale = level.scaleHalf
    moctCubeSides.forEach(moctCubeSide => {
      const side = moctNode.sides[moctCubeSide.index]
      if (side.isVisible) pushFace(origin, scale, moctCubeSide)
    })
  }
}

export const cubeShape = new CubeShape()
