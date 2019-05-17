import * as THREE from 'three'

// const cubeConfig = {
//   faces: [
//     '-##', '+##',
//     '#-#', '#+#',
//     '##-', '##+'
//   ]
// }

export const voxdarSideLength = 14
const voxdarLength = voxdarSideLength * voxdarSideLength * voxdarSideLength

export function createVoxdar () {
  const voxdar = new Uint8Array(voxdarLength)
  return voxdar
}

// export function resolveVoxdarCoord (x, y, z) {
//   return x + y * voxdarSideLength + z * voxdarSideLength * voxdarSideLength
// }

// export function resolveVoxdarCoordVec (vec) {
//   return resolveVoxdarCoord(vec.x, vec.y, vec.z)
// }

function wrapXyzIter (sideLength, func) {
  const sideLength2 = sideLength * sideLength
  const sideLength3 = sideLength2 * sideLength
  return (...args) => {
    const pos = new THREE.Vector3(0, 0, 0)
    let indexCur = 0
    const indexAdjFace = {
      0: -1,
      1: 1,
      2: -sideLength,
      3: sideLength,
      4: -sideLength2,
      5: sideLength2
    }
    const validAdjFace = {
      0: false,
      1: false,
      2: false,
      3: false,
      4: false,
      5: false
    }
    for (pos.z = 0; pos.z < sideLength; ++pos.z) {
      validAdjFace[4] = pos.z > 0
      validAdjFace[5] = pos.z + 1 < sideLength
      for (pos.y = 0; pos.y < sideLength; ++pos.y) {
        validAdjFace[2] = pos.y > 0
        validAdjFace[3] = pos.y + 1 < sideLength
        for (pos.x = 0; pos.x < sideLength; ++pos.x) {
          validAdjFace[0] = pos.x > 0
          validAdjFace[1] = pos.x + 1 < sideLength
          func(pos, indexCur, indexAdjFace, validAdjFace, sideLength, sideLength2, sideLength3, ...args)
          ++indexCur
          for (let i = 0; i < 6; ++i) ++indexAdjFace[i]
        }
      }
    }
  }
}

// function checkIndexBounds (index, sideLength3) {
//   return index >= 0 && index < sideLength3
// }

function voxdarCheckDrawMat (voxdar, index) {
  return voxdar[index] > 0
}

// function meshFace (pos, bufferSet, nX, nY, nZ, p0) {
//   const normal = new THREE.Vector3(nX, nY, nZ)

// }

const meshFaces = {
  0: {
    normal: new THREE.Vector3(-1, 0, 0),
    pos: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1)],
    testColor: new THREE.Vector3(1, 0, 0)
  },
  1: {
    normal: new THREE.Vector3(+1, 0, 0),
    pos: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 0), new THREE.Vector3(1, 0, 1), new THREE.Vector3(1, 1, 1)],
    testColor: new THREE.Vector3(1, 0, 1)
  },
  2: {
    normal: new THREE.Vector3(0, -1, 0),
    pos: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 1)],
    testColor: new THREE.Vector3(0, 1, 0)
  },
  3: {
    normal: new THREE.Vector3(0, +1, 0),
    pos: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 1, 1), new THREE.Vector3(1, 1, 0), new THREE.Vector3(1, 1, 1)],
    testColor: new THREE.Vector3(0, 1, 1)
  },
  4: {
    normal: new THREE.Vector3(0, 0, -1),
    pos: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 1, 0)],
    testColor: new THREE.Vector3(1, 1, 0)
  },
  5: {
    normal: new THREE.Vector3(0, 0, +1),
    pos: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 1, 1), new THREE.Vector3(1, 1, 1)],
    testColor: new THREE.Vector3(1, 1, 1)
  }
}

const meshVoxdarImpl = wrapXyzIter(voxdarSideLength, function meshVoxdarBody (pos, indexCur, indexAdjFace, validAdjFace, sl, sl2, sl3, voxdar, bufferSet) {
  const dm = voxdarCheckDrawMat(voxdar, indexCur)
  if (!dm) return
  const drawFace = {}
  let faceCount = 0
  for (let i = 0; i < 6; ++i) {
    const indexAdj = indexAdjFace[i]
    // const draw = !checkIndexBounds(indexAdj, sl3) || // checkIndexBounds is nonsensical/wrong, need to check pos
    const draw = !validAdjFace[i] ||
      !voxdarCheckDrawMat(voxdar, indexAdj)
    drawFace[i] = draw
    if (draw) ++faceCount
  }
  const vertexCount = 4 * faceCount
  bufferSet.forEachNonIndex((buffer) => buffer.padSize(buffer.countCurrent + vertexCount)) // TODO index
  const {index, position, normal, color} = bufferSet
  for (let i = 0; i < 6; ++i) {
    if (!drawFace[i]) continue
    const meshFace = meshFaces[i]
    const p0 = new THREE.Vector3().copy(pos).add(meshFace.pos[0])
    const p1 = new THREE.Vector3().copy(pos).add(meshFace.pos[1])
    const p2 = new THREE.Vector3().copy(pos).add(meshFace.pos[2])
    const p3 = new THREE.Vector3().copy(pos).add(meshFace.pos[3])
    position.upushVector3(p0, p1, p2, p3)
    normal.upushVector3(meshFace.normal, meshFace.normal, meshFace.normal, meshFace.normal)
    const testColor = meshFace.testColor
    color.upushVector3(testColor, testColor, testColor, testColor)
    index.pushRelative(0, 1, 2, 1, 3, 2)
  }
})
export const meshVoxdar = (voxdar, bufferSet) => meshVoxdarImpl(voxdar, bufferSet)

const modVoxdarImpl = wrapXyzIter(voxdarSideLength, function modVoxdarBody (pos, indexCur, indexAdjFace, validAdjFace, sl, sl2, sl3, voxdar, func) {
  const newVal = func(voxdar[indexCur], pos, indexCur, indexAdjFace, validAdjFace, sl, sl2, sl3)
  if (newVal) voxdar[indexCur] = newVal
})
export const modVoxdar = (voxdar, func) => modVoxdarImpl(voxdar, func)
