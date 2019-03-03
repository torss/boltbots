/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './sample.vert.glsl'
import fragmentShader from './sample.frag.glsl'
import {BufferAttributeExt} from '../../extensions'
import '../../extensions/three/Vector3'
import {moctOctants} from '../../moctree'
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
    normal: new BufferAttributeExt(new Float32Array(), 3),
    color: new BufferAttributeExt(new Float32Array(), 3)
  }

  const lsdfConfigs = initTestLsdfConfigs(1)

  console.time('CONSTRUCT')
  let pointCount = 0
  lsdfConfigs.forEach((lsdfConfig, lsdfConfigIndex) => {
    const loctTree = new LoctTree()
    loctTree.origin.x = lsdfConfigIndex
    const sdfFunc = constructNaiveSdfFunc(lsdfConfigIndex > 0 && lsdfConfig)
    const postSplitFunc = (loctNode, loctNodeOrigin) => {
      if (loctNode.isLeaf || loctNode.subLeafCount !== 8) return
      const subs = loctNode.subs
      const preNormalAxis = (subs, a0, a1, a2, a3, b0, b1, b2, b3) =>
        (subs[a0].sdfValue + subs[a1].sdfValue + subs[a2].sdfValue + subs[a3].sdfValue) * 0.25 -
        (subs[b0].sdfValue + subs[b1].sdfValue + subs[b2].sdfValue + subs[b3].sdfValue) * 0.25
      const normal = new THREE.Vector3(
        preNormalAxis(subs, 0, 2, 4, 6, 1, 3, 5, 7),
        preNormalAxis(subs, 0, 1, 4, 5, 2, 3, 6, 7),
        preNormalAxis(subs, 0, 1, 2, 3, 4, 5, 6, 7)
      ).normalize()
      addPoint(buffers, loctNodeOrigin, normal)
      ++pointCount
    }
    refineLoctTree({loctTree, maxDepth: 8, sdfEpsilon: 0, sdfFunc, postSplitFunc}) // sdfEpsilon: 0.000625
  })
  console.timeEnd('CONSTRUCT')
  console.log('pointCount: ' + pointCount)

  Object.entries(buffers).forEach(([key, value]) => geometry.addAttribute(key, value.fitSize()))
  return geometry
}

function addPoint (buffers, position, normal) {
  buffers.position.pushVector3(position)
  buffers.normal.pushVector3(normal)
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
  refineLoctNodeSplit(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctTree, loctTree.tln, loctTree.origin.clone())
}

function refineLoctNodeObtain (sdfFunc, loctNode, loctNodeOrigin) {
  loctNode.sdfValue = sdfFunc(loctNodeOrigin)
}

function refineLoctNodeSplit (maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctTree, loctNode, loctNodeOrigin) {
  loctNode.split(loctTree.reuseNodes)
  const calcSubPos = (loctNodeOrigin, octant, level) => new THREE.Vector3().copy(loctNodeOrigin).addScaledVector(octant.direction, level.scaleHalf)

  let positive = false
  let negative = false
  for (let i = 0; i < 8; ++i) {
    const sub = loctNode.subs[i]
    const subEdge = calcSubPos(loctNodeOrigin, moctOctants[i], loctNode.level)
    refineLoctNodeObtain(sdfFunc, sub, subEdge)
    if (sub.sdfValue >= 0) positive = true
    else negative = true
  }
  for (let i = 0; i < 8; ++i) {
    const sub = loctNode.subs[i]
    const subOrigin = calcSubPos(loctNodeOrigin, moctOctants[i], sub.level)
    refineLoctNode(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctTree, sub, subOrigin)
  }
  if (positive && negative) {
    postSplitFunc(loctNode, loctNodeOrigin)
  }
  loctTree.reuseNodes.push(loctNode.subs)
  loctNode.subs = undefined
  // if (loctNode.parent) ++loctNode.parent.subLeafCount
}

function refineLoctNode (maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctTree, loctNode, loctNodeOrigin) {
  const sdfValueAbs = Math.abs(loctNode.sdfValue)
  if (sdfValueAbs < 2 * loctNode.level.diagonalHalf && loctNode.level.depth < maxDepth) {
    refineLoctNodeSplit(maxDepth, sdfEpsilon, sdfFunc, postSplitFunc, loctTree, loctNode, loctNodeOrigin)
  }
}
