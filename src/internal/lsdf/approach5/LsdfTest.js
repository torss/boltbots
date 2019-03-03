/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './sample.vert.glsl'
import fragmentShader from './sample.frag.glsl'
import {moctCubeSides, moctOctants} from '../../moctree'
import {BufferAttributeExtIndex, BufferAttributeExt} from '../../extensions'
import '../../extensions/three/Vector3'
import {lsdfOpTypes, initTestLsdfConfigs} from '../LsdfOpType'
import {LoctTree} from './LoctTree'

export function lsdfTest (vueInstance, scene, camera, materialParam) {
  // const material = new THREE.RawShaderMaterial({
  //   uniforms: {
  //     time: { value: 1.0 },
  //     typeMap: new THREE.Uniform(),
  //     typeMapTexelSize: new THREE.Uniform(new THREE.Vector2(0, 0)),
  //     volume: new THREE.Uniform(),
  //     volumeTexelSize: new THREE.Uniform(new THREE.Vector2(0, 0))
  //   },
  //   vertexShader,
  //   fragmentShader,
  //   side: THREE.FrontSide,
  //   transparent: true
  // })
  // addTestCube(scene, material)

  addTestCube(scene, undefined)

  // const intervalId = setInterval(() => { material.uniforms.time.value = performance.now() * 0.005 }, 16)
  // vueInstance.$deinit.push(() => clearInterval(intervalId))
}

function addTestCube (scene, material) {
  const geometry = createCubeGeometry(material)
  // const cube = new THREE.Mesh(geometry, material)
  // scene.add(cube)
  material = new THREE.PointsMaterial({ size: 0.0125, sizeAttenuation: true, vertexColors: THREE.VertexColors })
  const points = new THREE.Points(geometry, material)
  scene.add(points)
}

function createCubeGeometry (material) {
  const geometry = new THREE.BufferGeometry()
  const buffers = {
    position: new BufferAttributeExt(new Float32Array(), 3),
    color: new BufferAttributeExt(new Float32Array(), 3)
  }
  // const indices = new BufferAttributeExtIndex()
  // const relposs = new BufferAttributeExt(new Float32Array(), 3)
  // const normals = new BufferAttributeExt(new Float32Array(), 3)
  // const uvs = new BufferAttributeExt(new Float32Array(), 2)
  // const shapeTypes = new BufferAttributeExt(new Float32Array(), 3)
  // const diagonalHalfs = new BufferAttributeExt(new Float32Array(), 1)
  // const scales = new BufferAttributeExt(new Float32Array(), 1)

  const lsdfConfigs = initTestLsdfConfigs(3)

  let pointCount = 0
  lsdfConfigs.forEach((lsdfConfig, lsdfConfigIndex) => {
    const loctTree = new LoctTree()
    loctTree.origin.x = lsdfConfigIndex
    const sdfFunc = constructNaiveSdfFunc(lsdfConfigIndex > 0 && lsdfConfig)
    const postSplitFunc = (loctNode, loctNodeOrigin) => {
      if (loctNode.isLeaf || loctNode.subLeafCount !== 8) return
      addPoint(buffers, loctNodeOrigin)
      ++pointCount
    }
    refineLoctTree({loctTree, maxDepth: 8, sdfEpsilon: 0, sdfFunc, postSplitFunc}) // sdfEpsilon: 0.000625
  })
  console.log('pointCount: ' + pointCount)

  Object.entries(buffers).forEach(([key, value]) => geometry.addAttribute(key, value.fitSize()))
  // geometry.setIndex(indices.fitSize())
  // geometry.addAttribute('position', positions.fitSize())
  // geometry.addAttribute('relpos', relposs.fitSize())
  // geometry.addAttribute('normal', normals.fitSize())
  // geometry.addAttribute('uv', uvs.fitSize())
  // geometry.addAttribute('shapeType', shapeTypes.fitSize())
  // geometry.addAttribute('diagonalHalfs', diagonalHalfs.fitSize())
  // geometry.addAttribute('scales', scales.fitSize())
  // // geometry.addAttribute('lsdfConfig', lsdfConfigs.fitSize())
  return geometry
}

function addPoint (buffers, position) {
  buffers.position.pushVector3(position)
  buffers.color.pushVector3(new THREE.Vector3(Math.random(), Math.random(), Math.random()))
}

function constructNaiveSdfFunc (lsdfConfig) {
  if (!lsdfConfig) return (position) => position.length() - 0.4 // Test

  const evaluate = (position, lsdfConfig) => {
    const opType = lsdfOpTypes[lsdfConfig.type]
    let result = 0
    if (opType.kind === 'combine') {
      const x = evaluate(position, lsdfConfig.x)
      const y = evaluate(position, lsdfConfig.y)
      switch (lsdfConfig.type) {
        case 'unionSmooth':
        case 'subtractSmooth':
        case 'intersectSmooth':
          result = opType.func(x, y, lsdfConfig.radius)
          break
        default:
          result = opType.func(x, y)
      }
    } else {
      switch (lsdfConfig.type) {
        case 'sphere':
          result = opType.func(position.clone().sub(lsdfConfig.position), lsdfConfig.radius)
          break
        case 'box':
          result = opType.func(position.clone().sub(lsdfConfig.position), lsdfConfig.size)
          break
        default:
          console.warn('Unknown ' + opType.kind + ' lsdfConfig.type: ' + lsdfConfig.type)
      }
    }
    return result
  }
  return (position) => evaluate(position, lsdfConfig)
}

function refineLoctTree ({loctTree, maxDepth, sdfEpsilon, sdfFunc, postSplitFunc}) {
  // if (!leafFunc) leafFunc = (loctNode, loctNodeOrigin) => {}
  if (!postSplitFunc) postSplitFunc = (loctNode, loctNodeOrigin) => {}
  refineLoctNodeSplit(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctTree.tln, loctTree.origin.clone())
}

function refineLoctNodeObtain (sdfFunc, loctNode, loctNodeOrigin) {
  loctNode.sdfValue = sdfFunc(loctNodeOrigin)
}

function refineLoctNodeSplit (maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctNode, loctNodeOrigin) {
  loctNode.split()
  const calcSubPos = (loctNodeOrigin, sub, level) => new THREE.Vector3().copy(loctNodeOrigin).addScaledVector(sub.octant.direction, level.scaleHalf)

  // for (let i = 0; i < 8; ++i) {
  //   const sub = loctNode.subs[i]
  //   const subOrigin = calcSubPos(loctNodeOrigin, sub, sub.level) // new THREE.Vector3().copy(loctNodeOrigin).addScaledVector(sub.octant.direction, sub.level.scaleHalf)
  //   refineLoctNode(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, sub, subOrigin)
  // }
  // postSplitFunc(loctNode, loctNodeOrigin)

  let positive = false
  let negative = false
  for (let i = 0; i < 8; ++i) {
    const sub = loctNode.subs[i]
    const subEdge = calcSubPos(loctNodeOrigin, sub, loctNode.level)
    refineLoctNodeObtain(sdfFunc, sub, subEdge)
    if (sub.sdfValue >= 0) positive = true
    else negative = true
  }
  for (let i = 0; i < 8; ++i) {
    const sub = loctNode.subs[i]
    const subOrigin = calcSubPos(loctNodeOrigin, sub, sub.level)
    refineLoctNode(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, sub, subOrigin)
  }
  if (positive && negative) {
    postSplitFunc(loctNode, loctNodeOrigin)
  }
  // else {
  //   loctNode.subs.length = 0 // TODO proper recursive merge
  // }
  loctNode.subs.length = 0
}

function refineLoctNode (maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctNode, loctNodeOrigin) {
  // refineLoctNodeObtain(sdfFunc, loctNode, loctNodeOrigin) // loctNode.sdfValue = sdfFunc(loctNodeOrigin)
  // const sdfValueAbs = Math.abs(loctNode.sdfValue)
  // if (sdfValueAbs < loctNode.level.diagonalHalf && sdfValueAbs > sdfEpsilon && loctNode.level.depth < maxDepth) {
  //   refineLoctNodeSplit(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctNode, loctNodeOrigin)
  // }
  // // else { leafFunc(loctNode, loctNodeOrigin) }

  const sdfValueAbs = Math.abs(loctNode.sdfValue)
  if (sdfValueAbs < 2 * loctNode.level.diagonalHalf && loctNode.level.depth < maxDepth) {
    refineLoctNodeSplit(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctNode, loctNodeOrigin)
  }
}

function addCubeFaces (origin, shapeType, indices, positions, relposs, normals, uvs, shapeTypes, diagonalHalfs, diagonalHalf, scales, scale = 0.5) {
  moctCubeSides.forEach((moctCubeSide) => {
    const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
    indices.pushRelative(0, 1, 2, 1, 3, 2)
    positions.pushVector3(points[0], points[1], points[2], points[3])
    relposs.pushVector3(moctCubeSide.faceDrawCc[0], moctCubeSide.faceDrawCc[1], moctCubeSide.faceDrawCc[2], moctCubeSide.faceDrawCc[3])
    const normal = moctCubeSide.normal
    normals.pushVector3(normal, normal, normal, normal)
    const uvRange = [0, 1]
    uvRange.forEach(u => uvRange.forEach(v => uvs.pushVector2(new THREE.Vector2(u, v))))
    shapeTypes.pushVector3(shapeType, shapeType, shapeType, shapeType)
    diagonalHalfs.pushScalar(diagonalHalf, diagonalHalf, diagonalHalf, diagonalHalf)
    scales.pushScalar(scale, scale, scale, scale)
    // lsdfConfigs.pushScalar(lsdfConfig, lsdfConfig, lsdfConfig, lsdfConfig)
  })
}

function initTestTextureFromLsdfConfigs (lsdfConfigs) {
  const textureSize = new THREE.Vector2(lsdfConfigs.length, lsdfConfigs.length)
  const size = textureSize.x * textureSize.y
  const data = new Float32Array(4 * size)
  for (let i = 0; i < data.length; ++i) data[i] = 0
  let i
  let stackIndex
  const writeData = (lsdfConfig) => {
    const opType = lsdfOpTypes[lsdfConfig.type]
    if (opType.kind === 'combine') {
      const x = writeData(lsdfConfig.x)
      const y = writeData(lsdfConfig.y)
      data[i++] = x
      data[i++] = y
      data[i++] = 0
      data[i++] = opType.opCode
      switch (lsdfConfig.type) {
        case 'unionSmooth':
        case 'subtractSmooth':
        case 'intersectSmooth':
          data[i++] = lsdfConfig.radius
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
          break
        default:
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
      }
    } else {
      if (opType.typeMapSize <= 0) console.warn('W190302-0239') // Shouldn't actually be possible atm
      data[i++] = lsdfConfig.position.x
      data[i++] = lsdfConfig.position.y
      data[i++] = lsdfConfig.position.z
      data[i++] = opType.opCode
      switch (lsdfConfig.type) {
        case 'sphere':
          data[i++] = lsdfConfig.radius
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
          break
        case 'box':
          data[i++] = lsdfConfig.size.x
          data[i++] = lsdfConfig.size.y
          data[i++] = lsdfConfig.size.z
          data[i++] = 0
          break
        default:
          console.warn('Unknown ' + opType.kind + ' lsdfConfig.type: ' + lsdfConfig.type)
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
      }
    }
    if (stackIndex + 1 > 16) console.error('E190302-0332 LSDF complexity too high')
    return stackIndex++
  }
  for (let lsdfConfigIndex = 0; lsdfConfigIndex < lsdfConfigs.length; ++lsdfConfigIndex) {
    i = lsdfConfigIndex * textureSize.x * 4
    stackIndex = 0
    const lsdfConfig = lsdfConfigs[lsdfConfigIndex]
    writeData(lsdfConfig)
    for (let j = 0; j < 8; ++j) data[i++] = 0
  }
  const texture = new THREE.DataTexture(data, textureSize.x, textureSize.y, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return {texture, textureSize}
}
