/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './sample.vert.glsl'
import fragmentShader from './sample.frag.glsl'
import {BufferAttributeExt} from '../../extensions'
import '../../extensions/three/Vector3'
import {lsdfOpTypes, initTestLsdfConfigs} from '../LsdfOpType'
import {LoctTree} from './LoctTree'

export function lsdfTest (vueInstance, scene, camera, materialParam, renderer) {
  // const pointSize = 4 // 0.125
  const material = new THREE.RawShaderMaterial({
    uniforms: {
      scale: { value: 6 }
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    transparent: false
  })
  addTestShapes(scene, material)

  const intervalId = setInterval(() => {
    // WebGLRenderer.js - isPointsMaterial - refreshUniformsPoints
    // material.uniforms.size.value = pointSize * renderer.getPixelRatio()
    // material.uniforms.scale.value = 0.5 * renderer.getSize(new THREE.Vector2()).y
    material.uniforms.scale.value = 6 * Math.abs(Math.cos(performance.now() * 0.001))
  }, 16)
  vueInstance.$deinit.push(() => clearInterval(intervalId))
}

function addTestShapes (scene, material) {
  const geometry = createGeometry(material)
  // material = new THREE.PointsMaterial({ size: 0.0125, sizeAttenuation: true, vertexColors: THREE.VertexColors })
  const points = new THREE.Points(geometry, material)
  scene.add(points)
}

function createGeometry (material) {
  const geometry = new THREE.BufferGeometry()
  const buffers = {
    position: new BufferAttributeExt(new Float32Array(), 3),
    color: new BufferAttributeExt(new Float32Array(), 3)
  }

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
  loctNode.subs.length = 0
}

function refineLoctNode (maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctNode, loctNodeOrigin) {
  const sdfValueAbs = Math.abs(loctNode.sdfValue)
  if (sdfValueAbs < 2 * loctNode.level.diagonalHalf && loctNode.level.depth < maxDepth) {
    refineLoctNodeSplit(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctNode, loctNodeOrigin)
  }
}
