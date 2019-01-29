import * as THREE from 'three'

// Port of https://github.com/gieseanw/Dubins/blob/8b901aaecaac0d90842e69a48136008a19064339/Includes.cpp#L16
export function getCircleTangentLines (x1, y1, r1, x2, y2, r2, VectorType = THREE.Vector2) {
  const dSq = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
  const returnVec = []
  if (dSq < (r1 - r2) * (r1 - r2)) {
    // we may have a problem, the circles are either intersecting, one is within the other, but still tangent
    // at one point, or one is completely in the other. We only have a problem if one is within the other, but
    // not tangent to it anywhere
    if (dSq !== Math.max(r1, r2) && dSq < Math.max(r1, r2)) {
      console.warn('Circles are contained with each other and not tangent. No tangent lines exist')
      return undefined
    }// else they are intersecting or one is within the other, but still tangent to it
    // in the other two cases, either 1 or 2 external tangent lines remain, but there are no internal tangent
    // lines
  }

  const d = Math.sqrt(dSq)
  const vx = (x2 - x1) / d
  const vy = (y2 - y1) / d
  for (let sign1 = +1; sign1 >= -1; sign1 -= 2) {
    const c = (r1 - sign1 * r2) / d
    if (c * c > 1.0) continue // want to be subtracting small from large, not adding
    const h = Math.sqrt(Math.max(0.0, 1.0 - c * c))

    for (let sign2 = +1; sign2 >= -1; sign2 -= 2) {
      const nx = vx * c - sign2 * h * vy
      const ny = vy * c + sign2 * h * vx
      returnVec.push({
        '0': new VectorType(x1 + r1 * nx, y1 + r1 * ny),
        '1': new VectorType(x2 + sign1 * r2 * nx, y2 + sign1 * r2 * ny)
      })
    }
  }
  return returnVec
}

export function getCircleTangentLinesVec (p1, r1, p2, r2, VectorType) {
  return getCircleTangentLines(p1.x, p1.y, r1, p2.x, p2.y, r2, VectorType)
}
