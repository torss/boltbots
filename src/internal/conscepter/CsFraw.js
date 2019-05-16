import * as THREE from 'three'

class CsEdg {
  constructor () {
    this.corners = []
    this.faces = []
  }
}

class CsCor {
  constructor () {
    this.edges = []
    this.pos = new THREE.Vector3()
  }
}

class CsFac {
  constructor () {
    this.edges = []
    this.corners = []
    this.normal = new THREE.Vector3()
    this.sign = 1
  }
}

const cubeConfig = {
  corners: [
    '+++', '-++', '+-+', '--+',
    '++-', '-+-', '+--', '---'
  ],
  edges: [
    '#++', '#-+', '#+-', '#--',
    '+#+', '-#+', '+#-', '-#-',
    '++#', '-+#', '+-#', '--#'
  ],
  faces: [
    '+##', '-##',
    '#+#', '#-#',
    '##+', '##-'
  ]
}
const pushUnion = (array, item) => {
  if (!array.includes(item)) array.push(item)
}
const pushUnions = (array, ...items) => {
  for (const item of items) pushUnion(array, item)
}
const connectEdgCor = (edg, cor0, cor1) => {
  pushUnions(edg.corners, cor0, cor1)
  pushUnion(cor0.edges, edg)
  pushUnion(cor1.edges, edg)
}
const combineFuncs = (funcPre, funcPost) => {
  if (funcPre) {
    return (edges, corners) => {
      funcPre(edges, corners)
      funcPost(edges, corners)
    }
  } else {
    return funcPost
  }
}
const cubeSetCor = (corners) => {
  cubeConfig.corners.forEach((cornerConfig, cornerIndex) => {
    const corner = corners[cornerIndex]
    for (const [index, value] of cornerConfig.split('').entries()) corner.pos.setComponent(index, value === '-' ? -1 : 1)
  })
}
const cubeConnectEdgCor = (() => {
  let finalFunc
  cubeConfig.edges.forEach((edgeConfig, edgeIndex) => {
    const index0 = cubeConfig.corners.indexOf(edgeConfig.replace('#', '+'))
    const index1 = cubeConfig.corners.indexOf(edgeConfig.replace('#', '-'))
    const func = (edges, corners) => connectEdgCor(edges[edgeIndex], corners[index0], corners[index1])
    finalFunc = combineFuncs(finalFunc, func)
  })
  return finalFunc
})()
const connectFacEdg = (fac, edg0, edg1, edg2, edg3) => {
  pushUnions(fac.edges, edg0, edg1, edg2, edg3)
  pushUnions(fac.corners, ...edg0.corners, ...edg1.corners, ...edg2.corners, ...edg3.corners)
  pushUnion(edg0.faces, fac)
  pushUnion(edg1.faces, fac)
  pushUnion(edg2.faces, fac)
  pushUnion(edg3.faces, fac)
}
const cubeConnectFacEdg = (() => {
  let finalFunc
  cubeConfig.faces.forEach((faceConfig, faceIndex) => {
    const index0 = cubeConfig.edges.indexOf(faceConfig.replace('#', '+'))
    const index1 = cubeConfig.edges.indexOf(faceConfig.replace('#', '-'))
    const index2 = cubeConfig.edges.indexOf(faceConfig.replace('#', '?').replace('#', '+').replace('?', '#'))
    const index3 = cubeConfig.edges.indexOf(faceConfig.replace('#', '?').replace('#', '-').replace('?', '#'))
    const normal = new THREE.Vector3()
    const match = faceConfig.match(/[+-]/)
    const sign = match[0] === '-' ? -1 : 1
    normal.setComponent(match.index, sign)
    const func = (faces, edges) => {
      const fac = faces[faceIndex]
      connectFacEdg(fac, edges[index0], edges[index1], edges[index2], edges[index3])
      const center = new THREE.Vector3()
      for (const corner of fac.corners) {
        center.addScaledVector(corner.pos, 1 / fac.corners.length)
      }
      fac.normal.copy(normal)
      fac.corners.sort((a, b) => center.angleTo(a.pos) - center.angleTo(b.pos))
      fac.sign = sign
    }
    finalFunc = combineFuncs(finalFunc, func)
  })
  return finalFunc
})()

export class CsFraw {
  constructor () {
    this.edges = []
    this.corners = []
    this.faces = []
    const {edges, corners, faces} = this
    for (let i = 0; i < 12; ++i) edges.push(new CsEdg())
    for (let i = 0; i < 8; ++i) corners.push(new CsCor())
    for (let i = 0; i < 6; ++i) faces.push(new CsFac())
    cubeSetCor(corners)
    cubeConnectEdgCor(edges, corners)
    cubeConnectFacEdg(faces, edges)
  }

  testConstruct (csBuf) {
    const {bufferSet} = csBuf
    const {index, position, normal, color} = bufferSet

    const vertexCount = 4 * this.faces.length
    bufferSet.forEachNonIndex((buffer) => buffer.padSize(buffer.countCurrent + vertexCount)) // TODO index

    for (const face of this.faces) {
      // TODO assumes cube face
      normal.upushVector3(face.normal, face.normal, face.normal, face.normal)
      if (face.corners.length !== 4) console.warn('CsFraw testConstruct face.corners.length ' + face.corners.length)
      position.upushVector3(...face.corners.map(corner => corner.pos))
      const testColor = new THREE.Vector3(1, 0, 0)
      color.upushVector3(testColor, testColor, testColor, testColor)
      if (face.sign < 0) index.pushRelative(0, 1, 2, 1, 3, 2)
      else index.pushRelative(2, 1, 0, 2, 3, 1)
    }
  }
}
