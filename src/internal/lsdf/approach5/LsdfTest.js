/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './splat.vert.glsl'
import fragmentShader from './splat.frag.glsl'
import vertexShaderDebug from './debug.vert.glsl'
import fragmentShaderDebug from './debug.frag.glsl'
import {BufferAttributeExt} from '../../extensions'
import '../../extensions/three/Vector3'
import '../../extensions/three/Camera'
import {moctOctants} from '../../moctree'
import {lsdfOpTypes, initTestLsdfConfigs} from '../LsdfOpType'
import {LoctTree} from './LoctTree'
import {LsdfGpu} from './LsdfGpu'

const settings = {
  maxDepth: 5,
  scale: 2,
  count: 1,
  firstSphere: true,
  pulse: false,
  gpuMarch: false,
  useLsdfVolumeForLoct: false,
  useLsdfVolumeForMarch: false,
  lsdfVolumeSideLength: 5
}

export function lsdfTest (vueInstance, scene, camera, materialParam, renderer, preAnimateFuncs) {
  window.settings = settings

  const lsdfGpu = new LsdfGpu(renderer, new THREE.Vector2(1024, 1024))

  // console.time('lsdfGpu.compute(false)')
  // for (let i = 0; i < 512; ++i) lsdfGpu.compute(false)
  // console.timeEnd('lsdfGpu.compute(false)')
  // console.time('lsdfGpu.compute(true)')
  // for (let i = 0; i < 512; ++i) lsdfGpu.compute(true)
  // console.timeEnd('lsdfGpu.compute(true)')
  // const dataTextures = lsdfGpu.dataTextures
  // const updateDataTextures = () => {
  //   dataTextures[0].needsUpdate = true
  //   dataTextures[1].needsUpdate = true
  //   dataTextures[2].needsUpdate = true
  // }
  // console.time('lsdfGpu.compute(false) + updateDataTextures')
  // for (let i = 0; i < 512; ++i) {
  //   updateDataTextures()
  //   lsdfGpu.compute(false)
  // }
  // console.timeEnd('lsdfGpu.compute(false) + updateDataTextures')
  // console.time('lsdfGpu.compute(true) + updateDataTextures')
  // for (let i = 0; i < 512; ++i) {
  //   updateDataTextures()
  //   lsdfGpu.compute(true)
  // }
  // console.timeEnd('lsdfGpu.compute(true) + updateDataTextures')

  // const lsdfGpuPlaneMaterial = new THREE.MeshBasicMaterial({
  //   map: lsdfGpu.renderTarget.texture
  // })
  const lsdfGpuPlaneMaterial = new THREE.RawShaderMaterial({
    uniforms: {
      map: { value: lsdfGpu.renderTarget.texture }
      // map: { value: testMap }
    },
    vertexShader: vertexShaderDebug,
    fragmentShader: fragmentShaderDebug,
    side: THREE.FrontSide,
    transparent: false
  })
  const lsdfGpuPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), lsdfGpuPlaneMaterial)
  lsdfGpuPlane.position.z -= 2
  scene.add(lsdfGpuPlane)

  // const pointSize = 4 // 0.125
  const material = new THREE.RawShaderMaterial({
    uniforms: {
      scale: { value: settings.scale }
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    transparent: false
  })
  const {lsdfInstances, points} = addTestShapes(scene, material)
  lsdfInstances.forEach((lsdfInstance, index) => {
    lsdfInstance.points.position.x = index
    lsdfInstance.addToScene(scene)
  })

  const splatBufferTest = new SplatBuffer()
  const splatBufferTestBuffer = splatBufferTest.buffers.position
  const splatBufferTestFunc = (vector3) => {
    if (splatBufferTestBuffer.count < ++splatBufferTestBuffer.countCurrent) splatBufferTestBuffer.resize(Math.nextPowerOfTwo(splatBufferTestBuffer.countCurrent))
    splatBufferTestBuffer.array[splatBufferTestBuffer.indexCurrent++] = vector3.x
    splatBufferTestBuffer.array[splatBufferTestBuffer.indexCurrent++] = vector3.y
    splatBufferTestBuffer.array[splatBufferTestBuffer.indexCurrent++] = vector3.z
  }
  let splatBufferTestFuncDirectCount = 0
  let splatBufferTestBufferArray = splatBufferTestBuffer.array
  const splatBufferTestFuncDirect = (vector3) => {
    // if (splatBufferTestBuffer.count < ++splatBufferTestBuffer.countCurrent) splatBufferTestBuffer.resize(Math.nextPowerOfTwo(splatBufferTestBuffer.countCurrent))
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount++] = vector3.x
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount++] = vector3.y
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount++] = vector3.z
  }
  const splatBufferTestFuncDirect2 = (x, y, z) => {
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount++] = x
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount++] = y
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount++] = z
  }
  const splatBufferTestFuncDirect3 = (x, y, z) => {
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount + 0] = x
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount + 1] = y
    splatBufferTestBufferArray[splatBufferTestFuncDirectCount + 2] = z
    splatBufferTestFuncDirectCount += 3
  }
  const splatBufferTestArray = []
  for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestArray.push(new THREE.Vector3())
  const splatBufferTestArrayTyped = new Float32Array(3 * 1920 * 1080)

  const dynamicSplatBufferTest = ((dummy) => {
    if (dummy) return () => {}
    const splatBuffer = new SplatBuffer()
    splatBuffer.setDynamic(true)
    const points = new THREE.Points(splatBuffer.geometry, material)
    scene.add(points)
    const {position, normal, color} = splatBuffer.buffers
    const size = 1920 * 1080
    position.padSize(size)
    normal.padSize(size)
    color.padSize(size)
    const positionArray = position.array
    const normalArray = normal.array
    const colorArray = color.array
    for (let i = 0, j = 0; i < size; ++i, j += 3) {
      positionArray[j + 0] += Math.random() * 10
      positionArray[j + 1] += Math.random() * 10
      positionArray[j + 2] += Math.random() * 10
      normalArray[j + 0] = 1
      normalArray[j + 1] = 0
      normalArray[j + 2] = 0
      colorArray[j + 0] = 0
      colorArray[j + 1] = 0
      colorArray[j + 2] = 0
    }
    return () => {
      for (let i = 0, j = 0; i < size; ++i, j += 3) {
        positionArray[j + 0] += 0.001
        positionArray[j + 1] += 0.002
        positionArray[j + 2] += 0.003
      }
      position.needsUpdate = true
    }
  })(true)

  preAnimateFuncs.push(() => {
    // WebGLRenderer.js - isPointsMaterial - refreshUniformsPoints
    // material.uniforms.size.value = pointSize * renderer.getPixelRatio()
    // material.uniforms.scale.value = 0.5 * renderer.getSize(new THREE.Vector2()).y
    if (settings.pulse) material.uniforms.scale.value = settings.scale * Math.abs(Math.cos(performance.now() * 0.001))
    lsdfInstances.forEach((lsdfInstance) => lsdfInstance.update(camera))
    dynamicSplatBufferTest()
  })
  vueInstance.$deinit.push(() => {
    lsdfInstances.forEach((lsdfInstance) => lsdfInstance.dispose())
    material.dispose()
    lsdfGpu.dispose()
    // TODO complete cleanup
  })
  vueInstance.$onKeydown.push((event) => {
    switch (event.key) {
      case 't':
        // lsdfInstances.forEach((lsdfInstance) => { lsdfInstance.testPlane.visible = !lsdfInstance.testPlane.visible })
        lsdfInstances.forEach((lsdfInstance) => lsdfInstance.testMarkers.forEach(x => { x.visible = !x.visible }))
        break
      case 'r':
        points.visible = !points.visible
        break
      case 's':
        lsdfInstances.forEach((lsdfInstance) => { lsdfInstance.march(camera, settings.gpuMarch && lsdfGpu) })
        break
      case 'i':
        createGeometry(material)
        break
      case 'q':
        const position = new THREE.Vector3(Math.random(), Math.random(), Math.random())
        // splatBufferTest.buffers.position.padSize(1920 * 1080)
        console.time('splatBufferTest - fitSize(true)')
        splatBufferTest.clear(false)
        for (let i = 0; i < 1920 * 1080; ++i) addPointTest(splatBufferTest.buffers, position)
        splatBufferTest.fitSize(true)
        console.timeEnd('splatBufferTest - fitSize(true)')
        console.time('splatBufferTest - fitSize(false)')
        splatBufferTest.clear(false)
        for (let i = 0; i < 1920 * 1080; ++i) addPointTest(splatBufferTest.buffers, position)
        splatBufferTest.fitSize(false)
        console.timeEnd('splatBufferTest - fitSize(false)')
        console.time('splatBufferTestFunc - fitSize(false)')
        splatBufferTest.clear(false)
        for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestFunc(position)
        splatBufferTest.fitSize(false)
        console.timeEnd('splatBufferTestFunc - fitSize(false)')
        // console.time('splatBufferTestFuncDirect - fitSize(false)')
        // splatBufferTest.clear(false)
        // for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestFuncDirect(position)
        // splatBufferTest.fitSize(false)
        // console.timeEnd('splatBufferTestFuncDirect - fitSize(false)')
        console.time('splatBufferTestFuncDirect')
        splatBufferTestFuncDirectCount = 0
        for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestFuncDirect(position)
        console.timeEnd('splatBufferTestFuncDirect')
        console.time('splatBufferTestFuncDirect2')
        splatBufferTestFuncDirectCount = 0
        for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestFuncDirect2(position.x, position.y, position.z)
        console.timeEnd('splatBufferTestFuncDirect2')
        console.time('splatBufferTestFuncDirect3')
        splatBufferTestFuncDirectCount = 0
        for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestFuncDirect3(position.x, position.y, position.z)
        console.timeEnd('splatBufferTestFuncDirect3')
        console.time('splatBufferTestArray')
        for (let i = 0; i < 1920 * 1080; ++i) splatBufferTestArray[i].copy(position)
        console.timeEnd('splatBufferTestArray')
        console.time('splatBufferTestArrayTyped')
        for (let i = 0, j = 0; i < 1920 * 1080; ++i, j += 3) {
          splatBufferTestArrayTyped[j + 0] = position.x
          splatBufferTestArrayTyped[j + 1] = position.y
          splatBufferTestArrayTyped[j + 2] = position.z
        }
        console.timeEnd('splatBufferTestArrayTyped')
        break
    }
  })
}

class LsdfVolume {
  constructor (sideLength) {
    this.array = new Float64Array(sideLength * sideLength * sideLength)
    this.sideLength = sideLength
  }

  get sideLength2 () {
    return this.sideLength * this.sideLength
  }

  fromLsdfFunc (lsdfFunc, scale = new THREE.Vector3(1, 1, 1), centerOffset = new THREE.Vector3(0, 0, 0)) {
    const {sideLength, sideLength2} = this
    const halfScale = scale.clone().divideScalar(2)
    const step = scale.clone().multiplyScalar(sideLength).redivScalar()
    const halfStep = step.clone().divideScalar(2)
    const posStart = centerOffset.clone().sub(halfScale).add(halfStep)
    const pos = new THREE.Vector3(0, 0, 0)
    const index = new THREE.Vector3(0, 0, 0)
    const indexArray = new THREE.Vector3(0, 0, 0)
    for (index.z = 0, indexArray.z = 0, pos.z = posStart.z; index.z < sideLength; ++index.z, indexArray.z += sideLength2, pos.z += step.z) {
      for (index.y = 0, indexArray.y = indexArray.z, pos.y = posStart.y; index.y < sideLength; ++index.y, indexArray.y += sideLength, pos.y += step.y) {
        for (index.x = 0, indexArray.x = indexArray.y, pos.x = posStart.x; index.x < sideLength; ++index.x, indexArray.x += 1, pos.x += step.x) {
          this.array[indexArray.x] = lsdfFunc(pos)
        }
      }
    }
  }

  sample (pos, minDist) {
    const {sideLength, sideLength2} = this
    const posFloor = pos.clone().floor()
    if (posFloor.x < 0 || posFloor.x >= sideLength || posFloor.y < 0 || posFloor.y >= sideLength || posFloor.z < 0 || posFloor.z >= sideLength) {
      return minDist
    }
    // const posNeighbor = pos.clone().sub(posFloor)
    // posNeighbor.x = posNeighbor.x > 0.5 ? posFloor.x + 1 : posFloor.x - 1
    // posNeighbor.y = posNeighbor.y > 0.5 ? posFloor.y + 1 : posFloor.y - 1
    // posNeighbor.z = posNeighbor.z > 0.5 ? posFloor.z + 1 : posFloor.z - 1
    // const toIndex = (position) => position.x + position.y * sideLength + position.z * sideLength2
    const indexFocus = posFloor.x + posFloor.y * sideLength + posFloor.z * sideLength2
    const valueFocus = this.array[indexFocus]
    let value = valueFocus
    for (const co of 'xyz') {
      const coPosFloor = posFloor[co]
      const coPosNeighbor = pos[co] - coPosFloor > 0.5 ? coPosFloor + 1 : coPosFloor - 1
      if (coPosNeighbor < 0 || coPosNeighbor >= sideLength) {
        value += valueFocus
      } else {
        const posNeighbor = new THREE.Vector3().copy(posFloor)
        posNeighbor[co] = coPosNeighbor
        const index = posNeighbor.x + posNeighbor.y * sideLength + posNeighbor.z * sideLength2
        value += this.array[index]
        // ! TODO proper weighted average
      }
    }
    value *= 0.25
    return Math.max(minDist, value)
  }
}

class LsdfInstance {
  constructor (lsdfConfig, sdfFunc, material) {
    this.lsdfConfig = lsdfConfig
    this.sdfFunc = sdfFunc
    this.splatBuffer = new SplatBuffer()
    this.points = new THREE.Points(this.splatBuffer.geometry, material)
    this.radius = new THREE.Vector2(0.5, 0.5).length()

    const sideLength = this.radius
    this.testMarkers = [1, 2, 3].map(() => new THREE.Mesh(
      new THREE.SphereGeometry(sideLength / 20),
      new THREE.MeshBasicMaterial({color: 0xf0f0f0, side: THREE.DoubleSide, transparent: true, opacity: 0.5})
    ))
    this.testMarkers.forEach((testMarker) => this.points.add(testMarker))
  }

  addToScene (scene) {
    scene.add(this.points)
  }

  dispose () {
    this.splatBuffer.dispose()
    this.testMarkers.forEach((testMarker) => {
      testMarker.geometry.dispose()
      testMarker.material.dispose()
    })
  }

  update (camera) {
    const normals = camera.getWorldNormals()
    const direction = camera.position.clone().sub(this.points.position).normalize()
    const testMarkers = this.testMarkers
    normals.up.multiplyScalar(this.radius)
    normals.side.multiplyScalar(this.radius)

    direction.multiplyScalar(this.radius)
    testMarkers[0].position.copy(direction)
    testMarkers[1].position.copy(testMarkers[0].position).add(normals.up)
    testMarkers[2].position.copy(testMarkers[0].position).add(normals.side)
  }

  march (camera, lsdfGpu) {
    const normals = camera.getWorldNormals()
    const direction = this.points.position.clone().sub(camera.position).normalize()
    normals.up.multiplyScalar(this.radius)
    normals.side.multiplyScalar(this.radius)

    this.splatBuffer.clear()
    const marchCenter = this.points.position.clone().sub(direction.clone().multiplyScalar(this.radius))
    const subdivs = 1024
    const subdivsRec = 2 / subdivs
    const steps = 32
    const minDist = 0.0001
    const epsilonDist = 0.01
    const marchSpacePos = new THREE.Vector2(-1, -1)
    const maxRayPosDistSquared = this.radius * this.radius
    let pointCount = 0
    let sdfCount = 0
    const getRayPos = () => {
      return new THREE.Vector3()
        .copy(marchCenter)
        .add(normals.up.clone().multiplyScalar(marchSpacePos.y))
        .add(normals.side.clone().multiplyScalar(marchSpacePos.x))
    }
    console.log('LsdfInstance.march')
    if (lsdfGpu) {
      console.time('LsdfInstance.march - gpu')
      const gpuStages = LsdfGpu.buildPlan(this.lsdfConfig) // Currently unused
      console.log('gpuStages: ' + gpuStages.length)
      const dataTextures = lsdfGpu.dataTextures
      // const data0 = dataTextures[0].image.data
      // const data1 = dataTextures[1].image.data
      // const data2 = dataTextures[2].image.data
      const {data0, data1, data2} = lsdfGpu
      const nextPosBatch = (capacity) => {
        let count = 0, i = 0
        for (; count < capacity; ++count) {
          if (marchSpacePos.y > 1) break
          if (marchSpacePos.x > 1) {
            marchSpacePos.x = -1
            marchSpacePos.y += subdivsRec
          }
          const rayPos = getRayPos()
          data0[i] = 0.0 // Test only
          // data0[i] = direction.x // Ray extension test: compute the next ray position in the fragment shader (requires direction input - uniform vs another data texture?)
          data1[i] = 0.4 // Test only
          data2[i++] = rayPos.x
          data0[i] = 0.0 // Test only
          // data0[i] = direction.y // Ray extension test
          data1[i] = 0.0 // Test only
          data2[i++] = rayPos.y
          data0[i] = 0.0 // Test only
          // data0[i] = direction.z // Ray extension test
          data1[i] = 0.0 // Test only
          data2[i++] = rayPos.z
          data0[i] = 1.0 // Test only
          // data0[i] = 0.0 // Test only
          data1[i] = 0.0 // Test only
          data2[i++] = 0
          marchSpacePos.x += subdivsRec
        }
        return count
      }
      let computeCalls = 0
      for (let batchSize; (batchSize = nextPosBatch(lsdfGpu.capacity)) > 0;) {
        for (let i = 0; i < 3; ++i) dataTextures[i].needsUpdate = true
        let batchSizeReal = batchSize
        for (let step = 0; step < steps && batchSizeReal > 0; ++step) {
          lsdfGpu.compute()
          ++computeCalls
          let count = 0, i = 0
          for (; count < batchSize; ++count, i += 4) {
            if (data2[i + 3] > 0) continue // TODO Discard could be done more efficiently by replacement with data from the batch's end and decrementing the batch size
            const rayPos = new THREE.Vector3(data2[i + 0], data2[i + 1], data2[i + 2])
            const dist = Math.max(minDist, lsdfGpu.output[i + 0])
            rayPos.add(direction.clone().multiplyScalar(dist))
            // const rayPos = new THREE.Vector3(lsdfGpu.output[i + 1], lsdfGpu.output[i + 2], lsdfGpu.output[i + 3])
            const rayPosLocal = rayPos.clone().sub(this.points.position)
            if (rayPosLocal.lengthSq() > maxRayPosDistSquared) {
              data2[i + 3] = 1
              --batchSizeReal
            } else if (dist < epsilonDist) {
              addPoint(this.splatBuffer.buffers, rayPosLocal, new THREE.Vector3(1, 0, 0))
              ++pointCount
              data2[i + 3] = 1
              --batchSizeReal
            } else {
              data2[i + 0] = rayPos.x
              data2[i + 1] = rayPos.y
              data2[i + 2] = rayPos.z
            }
          }
          dataTextures[2].needsUpdate = true
        }
      }
      console.timeEnd('LsdfInstance.march - gpu')
      console.log('pointCount: ' + pointCount)
      console.log('computeCalls: ' + computeCalls)
      console.log('computeCalls/pointCount: ' + (computeCalls / pointCount))
    } else {
      if (settings.useLsdfVolumeForMarch) {
        console.time('LsdfInstance.march - LsdfVolume creation')
        const lsdfVolume = new LsdfVolume(settings.lsdfVolumeSideLength)
        lsdfVolume.fromLsdfFunc(this.sdfFunc) // TODO LsdfVolume offset
        console.timeEnd('LsdfInstance.march - LsdfVolume creation')
        console.time('LsdfInstance.march - cpu - useLsdfVolume')
        for (marchSpacePos.y = -1; marchSpacePos.y <= 1; marchSpacePos.y += subdivsRec) {
          for (marchSpacePos.x = -1; marchSpacePos.x <= 1; marchSpacePos.x += subdivsRec) {
            const rayPos = getRayPos()
            for (let step = 0; step < steps; ++step) {
              const dist = lsdfVolume.sample(rayPos, minDist)
              ++sdfCount
              rayPos.add(direction.clone().multiplyScalar(dist))
              const rayPosLocal = rayPos.clone().sub(this.points.position)
              if (rayPosLocal.lengthSq() > maxRayPosDistSquared) break
              if (dist < epsilonDist) {
                addPoint(this.splatBuffer.buffers, rayPosLocal, new THREE.Vector3(1, 0, 0))
                ++pointCount
                break
              }
            }
          }
        }
        console.timeEnd('LsdfInstance.march - cpu - useLsdfVolume')
      } else {
        console.time('LsdfInstance.march - cpu')
        for (marchSpacePos.y = -1; marchSpacePos.y <= 1; marchSpacePos.y += subdivsRec) {
          for (marchSpacePos.x = -1; marchSpacePos.x <= 1; marchSpacePos.x += subdivsRec) {
            const rayPos = getRayPos()
            for (let step = 0; step < steps; ++step) {
              const dist = Math.max(minDist, this.sdfFunc(rayPos))
              ++sdfCount
              rayPos.add(direction.clone().multiplyScalar(dist))
              const rayPosLocal = rayPos.clone().sub(this.points.position)
              if (rayPosLocal.lengthSq() > maxRayPosDistSquared) break
              if (dist < epsilonDist) {
                addPoint(this.splatBuffer.buffers, rayPosLocal, new THREE.Vector3(1, 0, 0))
                ++pointCount
                break
              }
            }
          }
        }
        console.timeEnd('LsdfInstance.march - cpu')
      }
      console.log('pointCount: ' + pointCount)
      console.log('sdfCount: ' + sdfCount)
      console.log('sdfCount/pointCount: ' + (sdfCount / pointCount))
    }
    this.splatBuffer.fitSize()
  }
}

class SplatBuffer {
  constructor () {
    this.geometry = new THREE.BufferGeometry()
    this.buffers = {
      position: new BufferAttributeExt(new Float32Array(), 3),
      normal: new BufferAttributeExt(new Float32Array(), 3),
      color: new BufferAttributeExt(new Float32Array(), 3)
    }
    Object.entries(this.buffers).forEach(([key, buffer]) => this.geometry.addAttribute(key, buffer))
  }

  setDynamic (value) {
    Object.values(this.buffers).forEach((buffer) => { buffer.setDynamic(value) })
  }

  fitSize (markForUpdate = true) {
    Object.values(this.buffers).forEach((buffer) => buffer.fitSize(markForUpdate))
    return this
  }

  clear (resize = false) {
    Object.values(this.buffers).forEach((buffer) => buffer.clear(resize))
  }

  dispose () {
    this.geometry.dispose()
  }
}

function addTestShapes (scene, material) {
  const {splatBuffer, lsdfInstances} = createGeometry(material)
  // material = new THREE.PointsMaterial({ size: 0.0125, sizeAttenuation: true, vertexColors: THREE.VertexColors })
  const points = new THREE.Points(splatBuffer.geometry, material)
  scene.add(points)
  return {lsdfInstances, points}
}

function createGeometry (material) {
  const splatBuffer = new SplatBuffer()

  const lsdfConfigs = initTestLsdfConfigs(settings.count)
  if (settings.firstSphere) {
    lsdfConfigs[0] = {type: 'sphere', position: new THREE.Vector3(), radius: 0.4}
  }

  console.time('CONSTRUCT')
  let pointCount = 0
  let sdfCount = 0
  const lsdfInstances = []
  lsdfConfigs.forEach((lsdfConfig, lsdfConfigIndex) => {
    const loctTree = new LoctTree()
    loctTree.origin.x = lsdfConfigIndex
    const sdfFuncBase = buildSdfFunc(lsdfConfig)

    lsdfInstances.push(new LsdfInstance(lsdfConfig, sdfFuncBase, material))

    let sdfSampler
    if (settings.useLsdfVolumeForLoct) {
      console.time('CONSTRUCT - LsdfVolume creation')
      const lsdfVolume = new LsdfVolume(settings.lsdfVolumeSideLength)
      lsdfVolume.fromLsdfFunc(sdfFuncBase) // TODO LsdfVolume offset
      console.timeEnd('CONSTRUCT - LsdfVolume creation')
      sdfSampler = (position) => lsdfVolume.sample(position, 0) // TODO LsdfVolume fix minDist
    } else {
      sdfSampler = sdfFuncBase
    }

    const sdfFunc = (position) => {
      ++sdfCount
      return sdfSampler(position)
    }

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
      addPoint(splatBuffer.buffers, loctNodeOrigin, normal)
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
    refineLoctTree({loctTree, maxDepth: settings.maxDepth, sdfEpsilon: 0, sdfFunc, postSplitFunc}) // sdfEpsilon: 0.000625
  })
  console.timeEnd('CONSTRUCT')
  console.log('pointCount: ' + pointCount)
  console.log('sdfCount: ' + sdfCount)
  console.log('sdfCount/pointCount: ' + (sdfCount / pointCount))

  splatBuffer.fitSize(false)
  return {
    splatBuffer,
    lsdfInstances
  }
}

function addPoint (buffers, position, normal) {
  buffers.position.pushVector3(position)
  buffers.normal.pushVector3(normal)
  buffers.color.pushVector3(new THREE.Vector3(Math.random(), Math.random(), Math.random()))
}

function addPointTest (buffers, position) {
  buffers.position.pushVector3proto(position)
}

function buildSdfFunc (lsdfConfig) {
  const opType = lsdfOpTypes[lsdfConfig.type]
  const func = opType.func
  let result = 0
  if (opType.kind === 'combine') {
    const x = buildSdfFunc(lsdfConfig.x)
    const y = buildSdfFunc(lsdfConfig.y)
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
        console.warn('buildSdfFunc - Unknown ' + opType.kind + ' lsdfConfig.type: ' + lsdfConfig.type)
    }
  }
  return result
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
