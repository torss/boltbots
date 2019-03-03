/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './splat.vert.glsl'
import fragmentShader from './splat.frag.glsl'
import vertexShaderDebug from './debug.vert.glsl'
import fragmentShaderDebug from './debug.frag.glsl'
import {BufferAttributeExt} from '../../extensions'
import '../../extensions/three/Vector3'
import {moctOctants} from '../../moctree'
import {lsdfOpTypes, initTestLsdfConfigs} from '../LsdfOpType'
import {LoctTree} from './LoctTree'
import {LsdfGpu} from './LsdfGpu'

function rttTest (renderer, scene) {
  const cameraRTT = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000)
  cameraRTT.position.z = 100
  //
  const sceneRTT = scene // new THREE.Scene()
  var light = new THREE.DirectionalLight(0xffffff)
  light.position.set(0, 0, 1).normalize()
  sceneRTT.add(light)
  light = new THREE.DirectionalLight(0xffaaaa, 1.5)
  light.position.set(0, 0, -1).normalize()
  sceneRTT.add(light)
  const rtTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat })
  console.log('window.innerWidth, window.innerHeight: ' + window.innerWidth + ', ' + window.innerHeight)
  const vertexShader = `
  varying vec2 vUv;

  void main() {

    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

  }`
  const fragmentShaderPass1 = `
  varying vec2 vUv;
  uniform float time;

  void main() {

    float r = vUv.x;
    if( vUv.y < 0.5 ) r = 0.0;
    float g = vUv.y;
    if( vUv.x < 0.5 ) g = 0.0;

    gl_FragColor = vec4( r, g, time, 1.0 );

  }`
  const fragmentShaderScreen = `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;

  void main() {

    gl_FragColor = texture2D( tDiffuse, vUv );

  }`
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0.0 } },
    vertexShader,
    fragmentShader: fragmentShaderPass1
  })
  var materialScreen = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: rtTexture.texture } },
    vertexShader,
    fragmentShader: fragmentShaderScreen,
    depthWrite: false
  })
  var plane = new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight)
  let quad = new THREE.Mesh(plane, material)
  quad.position.z = -100
  sceneRTT.add(quad)
  var geometry = new THREE.TorusBufferGeometry(100, 25, 15, 30)
  var mat1 = new THREE.MeshPhongMaterial({ color: 0x555555, specular: 0xffaa00, shininess: 5 })
  var mat2 = new THREE.MeshPhongMaterial({ color: 0x550000, specular: 0xff2200, shininess: 5 })
  const zmesh1 = new THREE.Mesh(geometry, mat1)
  zmesh1.position.set(0, 0, 100)
  zmesh1.scale.set(1.5, 1.5, 1.5)
  sceneRTT.add(zmesh1)
  const zmesh2 = new THREE.Mesh(geometry, mat2)
  zmesh2.position.set(0, 150, 100)
  zmesh2.scale.set(0.75, 0.75, 0.75)
  sceneRTT.add(zmesh2)
  quad = new THREE.Mesh(plane, materialScreen)
  quad.position.z = -100
  window.rttTestRend = () => {
    var time = Date.now() * 0.0015
    if (zmesh1 && zmesh2) {
      zmesh1.rotation.y = -time
      zmesh2.rotation.y = -time + Math.PI / 2
    }
    // Render first scene into texture
    renderer.setRenderTarget(rtTexture)
    renderer.clear()
    renderer.render(sceneRTT, cameraRTT)
  }
  return {
    rtTexture,
    material2: new THREE.MeshBasicMaterial({ color: 0xffffff, map: rtTexture.texture })
  }
}

export function lsdfTest (vueInstance, scene, camera, materialParam, renderer) {
  const rttTestDat = rttTest(renderer, scene)
  const lsdfGpu = new LsdfGpu(renderer, new THREE.Vector2(256, 256))
  window.qwe = lsdfGpu // FIXME
  lsdfGpu.compute(false)
  // const mapData = new Uint8Array(3 * 8 * 8)
  // for (let i = 0; i < mapData.length; ++i) mapData[i] = Math.floor(Math.random() * 255)
  // const testMap = new THREE.DataTexture(mapData, 8, 8, THREE.RGBFormat, THREE.UnsignedByteType)
  const mapData = new Float32Array(4 * 8 * 8)
  for (let i = 0; i < mapData.length; ++i) mapData[i] = Math.random()
  const testMap = new THREE.DataTexture(mapData, 8, 8, THREE.RGBAFormat, THREE.FloatType)
  testMap.needsUpdate = true
  // const lsdfGpuPlaneMaterial = new THREE.MeshBasicMaterial({
  //   map: lsdfGpu.renderTarget.texture
  // })
  const lsdfGpuPlaneMaterial = new THREE.RawShaderMaterial({
    uniforms: {
      map: { value: rttTestDat.rtTexture.texture }
      // map: { value: lsdfGpu.renderTarget.texture }
      // map: { value: testMap }
    },
    vertexShader: vertexShaderDebug,
    fragmentShader: fragmentShaderDebug,
    side: THREE.FrontSide,
    transparent: false
  })
  const lsdfGpuPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), lsdfGpuPlaneMaterial)
  // lsdfGpuPlane.position.x -= 2
  scene.add(lsdfGpuPlane)
  // const lsdfGpuPlane2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), lsdfGpu.material)
  // scene.add(lsdfGpuPlane2)
  const lsdfGpuPlane3 = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), rttTestDat.material2)
  lsdfGpuPlane3.position.x += 2
  scene.add(lsdfGpuPlane3)

  // // const pointSize = 4 // 0.125
  // const material = new THREE.RawShaderMaterial({
  //   uniforms: {
  //     scale: { value: 6 }
  //   },
  //   vertexShader,
  //   fragmentShader,
  //   side: THREE.FrontSide,
  //   transparent: false
  // })
  // addTestShapes(scene, material)

  // const intervalId = setInterval(() => {
  //   // WebGLRenderer.js - isPointsMaterial - refreshUniformsPoints
  //   // material.uniforms.size.value = pointSize * renderer.getPixelRatio()
  //   // material.uniforms.scale.value = 0.5 * renderer.getSize(new THREE.Vector2()).y
  //   material.uniforms.scale.value = 6 * 4 * Math.abs(Math.cos(performance.now() * 0.001))
  // }, 16)
  // vueInstance.$deinit.push(() => {
  //   clearInterval(intervalId)
  //   material.dispose()
  //   lsdfGpu.dispose()
  //   // TODO complete cleanup
  // })
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

  const lsdfConfigs = initTestLsdfConfigs(16)

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

      // const range = 4
      // const factor = (1 / range) * 0.025
      // const pos = new THREE.Vector3()
      // const normalA = normal.clone()
      // // normalA.swizzle('z', 'x', 'y').multiplyScalar(factor)
      // // normalA.cross(normalA.clone().swizzle('z', 'x', 'y'))
      // // normalA.cross((normalA.y !== 0 || normalA.z !== 0) ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0))
      // // normalA.cross(new THREE.Vector3(
      // //   (normalA.x < normalA.y) && (normalA.x < normalA.z),
      // //   (normalA.y <= normalA.x) && (normalA.y < normalA.z),
      // //   (normalA.z <= normalA.x) && (normalA.z <= normalA.y)
      // // ))
      // normalA.cross(Math.abs(normalA.z) < Math.abs(normalA.x) ? new THREE.Vector3(normalA.y, -normalA.x, 0) : new THREE.Vector3(0, -normalA.z, normalA.y))
      // const normalB = normalA.clone().cross(normal)
      // normalA.multiplyScalar(factor)
      // normalB.multiplyScalar(factor)
      // pos.copy(loctNodeOrigin)
      // for (let i = 0; i < range; ++i) {
      //   let pos2 = pos.add(normalA).clone()
      //   for (let j = 0; j < range; ++j) {
      //     pos2.add(normalB)
      //     addPoint(buffers, pos2, normal)
      //   }
      //   pos2 = pos.add(normalA).clone()
      //   for (let j = 0; j < range; ++j) {
      //     pos2.sub(normalB)
      //     addPoint(buffers, pos2, normal)
      //   }
      // }
      // pos.copy(loctNodeOrigin)
      // for (let i = 0; i < range; ++i) {
      //   let pos2 = pos.sub(normalA).clone()
      //   for (let j = 0; j < range; ++j) {
      //     pos2.add(normalB)
      //     addPoint(buffers, pos2, normal)
      //   }
      //   pos2 = pos.sub(normalA).clone()
      //   for (let j = 0; j < range; ++j) {
      //     pos2.sub(normalB)
      //     addPoint(buffers, pos2, normal)
      //   }
      // }
    }
    refineLoctTree({loctTree, maxDepth: 6, sdfEpsilon: 0, sdfFunc, postSplitFunc}) // sdfEpsilon: 0.000625
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

  const buildEvaluator = (lsdfConfig) => {
    const opType = lsdfOpTypes[lsdfConfig.type]
    const func = opType.func
    let result = 0
    if (opType.kind === 'combine') {
      const x = buildEvaluator(lsdfConfig.x)
      const y = buildEvaluator(lsdfConfig.y)
      switch (lsdfConfig.type) {
        case 'unionSmooth':
        case 'subtractSmooth':
        case 'intersectSmooth':
          const radius = lsdfConfig.radius
          result = (position) => func(x(position), y(position), radius)
          break
        default:
          result = (position) => func(x(position), y(position))
      }
    } else {
      const offset = lsdfConfig.position.clone()
      switch (lsdfConfig.type) {
        case 'sphere':
          const radius = lsdfConfig.radius
          result = (position) => func(offset.clone().rsub(position), radius)
          break
        case 'box':
          const size = lsdfConfig.size
          result = (position) => func(offset.clone().rsub(position), size)
          break
        default:
          console.warn('Unknown ' + opType.kind + ' lsdfConfig.type: ' + lsdfConfig.type)
      }
    }
    return result
  }
  return buildEvaluator(lsdfConfig)
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
