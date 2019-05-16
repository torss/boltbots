/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './sample.vert.glsl'
import fragmentShader from './sample.frag.glsl'
import {moctCubeSides} from '../../moctree'
import {BufferAttributeExtIndex, BufferAttributeExt} from '../../extensions'
import {lsdfOpTypes, initTestLsdfConfigs} from '../LsdfOpType'

export function lsdfTest (vueInstance, scene, camera, materialParam) {
  const material = new THREE.RawShaderMaterial({
    uniforms: {
      time: { value: 1.0 },
      typeMap: new THREE.Uniform(),
      typeMapTexelSize: new THREE.Uniform(new THREE.Vector2(0, 0))
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    transparent: true
  })
  addTestCube(scene, material)

  const intervalId = setInterval(() => { material.uniforms.time.value = performance.now() * 0.005 }, 16)
  vueInstance.$deinit.push(() => clearInterval(intervalId))
}

function addTestPlane (scene, material) {
  const geometry = new THREE.PlaneBufferGeometry()
  const colorAttribute = new THREE.Uint8BufferAttribute([...Array(4 * 4)].map(() => Math.floor(0xff * Math.random())), 4)
  colorAttribute.normalized = true
  geometry.addAttribute('color', colorAttribute)
  const uvs = []
  const uvRange = [-1, 1]
  uvRange.forEach(u => uvRange.forEach(v => uvs.push(u, v)))
  const uvAttribute = new THREE.Float32BufferAttribute(uvs, 2)
  geometry.addAttribute('uv', uvAttribute)

  const plane = new THREE.Mesh(geometry, material)
  scene.add(plane)
}

function addTestCube (scene, material) {
  const geometry = createCubeGeometry(material)
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)
}

function createCubeGeometry (material) {
  const geometry = new THREE.BufferGeometry()
  const indices = new BufferAttributeExtIndex()
  const positions = new BufferAttributeExt(new Float32Array(), 3)
  const normals = new BufferAttributeExt(new Float32Array(), 3)
  const uvs = new BufferAttributeExt(new Float32Array(), 2)
  const shapeTypes = new BufferAttributeExt(new Float32Array(), 3)
  // const lsdfConfigs = new BufferAttributeExt(new Uint32Array(), 1)

  // const textureSize = new THREE.Vector2(16, 16)
  // const texture = initTestTexture(textureSize)
  const lsdfConfigs = initTestLsdfConfigs(16)
  const lsdfTypeTree = initTestLsdfTypeTree(lsdfConfigs)
  console.log('LSDF configuration types: ' + lsdfTypeTree.lsdfTypeLeaves.length)
  adjustLsdfFragmentShader(material, lsdfTypeTree)
  const {texture, textureSize} = initTestTextureFromLsdfConfigs(lsdfConfigs)
  material.uniforms.typeMap.value = texture
  material.uniforms.typeMapTexelSize.value = new THREE.Vector2(1, 1).divide(textureSize)

  for (let shapeIndex = 0; shapeIndex < textureSize.y; ++shapeIndex) {
    const shapeType = new THREE.Vector3(0.5 / textureSize.x, (0.5 / textureSize.y) + (shapeIndex / textureSize.y))
    shapeType.z = lsdfConfigs[shapeIndex].typeLeaf.typeId
    // shapeType.z = Math.floor(Math.random() * lsdfTypeTree.lsdfTypeLeaves.length)
    // const lsdfConfig = 0
    addCubeFaces(new THREE.Vector3(shapeIndex, 0, 0), shapeType, indices, positions, normals, uvs, shapeTypes)
  }
  geometry.setIndex(indices.fitSize())
  geometry.addAttribute('position', positions.fitSize())
  geometry.addAttribute('normal', normals.fitSize())
  geometry.addAttribute('uv', uvs.fitSize())
  geometry.addAttribute('shapeType', shapeTypes.fitSize())
  // geometry.addAttribute('lsdfConfig', lsdfConfigs.fitSize())
  return geometry
}

function addCubeFaces (origin, shapeType, indices, positions, normals, uvs, shapeTypes, scale = 0.5) {
  moctCubeSides.forEach((moctCubeSide) => {
    const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
    indices.pushRelative(0, 1, 2, 1, 3, 2)
    positions.pushVector3(points[0], points[1], points[2], points[3])
    const normal = moctCubeSide.normal
    normals.pushVector3(normal, normal, normal, normal)
    const uvRange = [0, 1]
    uvRange.forEach(u => uvRange.forEach(v => uvs.pushVector2(new THREE.Vector2(u, v))))
    shapeTypes.pushVector3(shapeType, shapeType, shapeType, shapeType)
    // lsdfConfigs.pushScalar(lsdfConfig, lsdfConfig, lsdfConfig, lsdfConfig)
  })
}

function initTestLsdfTypeTree (lsdfConfigs) {
  const initNode = (parent, key) => ({parent, key, subs: {}, useCount: 0, users: [], shaderCode: '', typeId: -1})
  const upsertNode = (parent, key) => {
    const sub = parent.subs[key]
    if (sub) return sub
    const newSub = initNode(parent, key)
    parent.subs[key] = newSub
    return newSub
  }
  const resolveConfig = (parent, lsdfConfig) => {
    const sub = upsertNode(parent, lsdfConfig.type)
    let resultType
    switch (lsdfOpTypes[lsdfConfig.type].kind) {
      case 'combine': {
        const x = resolveConfig(sub, lsdfConfig.x)
        const y = resolveConfig(x, lsdfConfig.y)
        resultType = y
      } break
      default: {
        resultType = sub
      }
    }
    return resultType
  }
  const genTexMapAccess = (typeMapIndex) => {
    // return 'texture(typeMap, vec2(vShapeType.x + (' + typeMapIndex + '. * typeMapTexelSize.x), vShapeType.y))'
    return 'tm' + typeMapIndex
  }
  const genPositionCode = (typeMapIndex) => {
    return 'position - ' + genTexMapAccess(typeMapIndex) + '.xyz'
  }
  const resolveCode = (lsdfConfig, resolveState = {typeMapIndex: 0}) => {
    const {typeMapIndex} = resolveState
    const typeMapSize = lsdfOpTypes[lsdfConfig.type].typeMapSize // || 0
    let resultCode
    const combineFunc = (funcName, params = '') => {
      const x = resolveCode(lsdfConfig.x, resolveState)
      const y = resolveCode(lsdfConfig.y, resolveState)
      resultCode = funcName + '(' + x + ', ' + y + params + ')'
    }
    const opType = lsdfOpTypes[lsdfConfig.type]
    switch (lsdfConfig.type) {
      case 'union':
      case 'subtract':
      case 'intersect':
        combineFunc(opType.funcName)
        break
      case 'unionSmooth':
      case 'subtractSmooth':
      case 'intersectSmooth': {
        const params = ', ' + genTexMapAccess(typeMapIndex) + '.x'
        resolveState.typeMapIndex += typeMapSize
        combineFunc(opType.funcName, params)
        resolveState.typeMapIndex -= typeMapSize
      } break
      case 'sphere':
        resultCode = 'sdSphere(' + genPositionCode(typeMapIndex) + ', ' + genTexMapAccess(typeMapIndex) + '.a)'
        break
      case 'box':
        resultCode = 'sdBox(' + genPositionCode(typeMapIndex) + ', ' + genTexMapAccess(typeMapIndex + 1) + '.xyz)'
        break
    }
    resolveState.typeMapIndex += typeMapSize
    return resultCode
  }
  const lsdfTypeRoot = initNode(undefined, '')
  const lsdfTypeLeaves = []
  for (const lsdfConfig of lsdfConfigs) {
    const leaf = resolveConfig(lsdfTypeRoot, lsdfConfig)
    if (leaf.useCount === 0) lsdfTypeLeaves.push(leaf)
    ++leaf.useCount
    leaf.users.push(lsdfConfig)
  }
  let typeMapIndexMax = 0
  lsdfTypeLeaves.forEach((lsdfTypeLeaf, index) => {
    lsdfTypeLeaf.typeId = index
    const resolveState = {typeMapIndex: 0}
    lsdfTypeLeaf.shaderCode = resolveCode(lsdfTypeLeaf.users[0], resolveState)
    typeMapIndexMax = Math.max(typeMapIndexMax, resolveState.typeMapIndex)
    for (const lsdfConfig of lsdfTypeLeaf.users) lsdfConfig.typeLeaf = lsdfTypeLeaf
    lsdfTypeLeaf.users = undefined
  })
  return {
    lsdfTypeRoot,
    lsdfTypeLeaves,
    typeMapIndexMax
  }
}

function adjustLsdfFragmentShader (material, lsdfTypeTree) {
  let shaderCode = ''
  for (const lsdfTypeLeaf of lsdfTypeTree.lsdfTypeLeaves) {
    shaderCode += '    case ' + lsdfTypeLeaf.typeId + 'u:\n      return ' + lsdfTypeLeaf.shaderCode + ';\n'
  }
  let shaderCodePre = ''
  for (let i = 0; i < lsdfTypeTree.typeMapIndexMax; ++i) {
    shaderCodePre += 'vec4 tm' + i + ' = texture(typeMap, vec2(vShapeType.x + (' + i + '. * typeMapTexelSize.x), vShapeType.y));\n'
  }
  window.waw = lsdfTypeTree.lsdfTypeLeaves // FIXME debug only
  window.shaderCode = shaderCode // FIXME debug only
  window.shaderCodePre = shaderCodePre // FIXME debug only
  material.fragmentShader = fragmentShader.replace('// [LSDF TYPE TARGET] //', shaderCode)
    .replace('// [LSDF PRE TARGET] //', shaderCodePre)
}

function initTestTextureFromLsdfConfigs (lsdfConfigs) {
  const textureSize = new THREE.Vector2(lsdfConfigs.length, lsdfConfigs.length)
  const size = textureSize.x * textureSize.y
  const data = new Float32Array(4 * size)
  for (let i = 0; i < data.length; ++i) data[i] = 0
  let i
  const writeData = (lsdfConfig) => {
    const opType = lsdfOpTypes[lsdfConfig.type]
    if (opType.typeMapSize > 0) {
      if (opType.kind === 'combine') {
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
            console.warn('Unknown ' + opType.kind + ' lsdfConfig.type: ' + lsdfConfig.type)
        }
      } else {
        data[i++] = lsdfConfig.position.x
        data[i++] = lsdfConfig.position.y
        data[i++] = lsdfConfig.position.z
        switch (lsdfConfig.type) {
          case 'sphere':
            data[i++] = lsdfConfig.radius
            break
          case 'box':
            data[i++] = 0
            data[i++] = lsdfConfig.size.x
            data[i++] = lsdfConfig.size.y
            data[i++] = lsdfConfig.size.z
            data[i++] = 0
            break
          default:
            console.warn('Unknown ' + opType.kind + ' lsdfConfig.type: ' + lsdfConfig.type)
            data[i++] = 0
        }
      }
    }
    if (opType.kind === 'combine') {
      writeData(lsdfConfig.x)
      writeData(lsdfConfig.y)
    }
  }
  for (let lsdfConfigIndex = 0; lsdfConfigIndex < lsdfConfigs.length; ++lsdfConfigIndex) {
    i = lsdfConfigIndex * textureSize.x * 4
    const lsdfConfig = lsdfConfigs[lsdfConfigIndex]
    writeData(lsdfConfig)
  }
  const texture = new THREE.DataTexture(data, textureSize.x, textureSize.y, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return {texture, textureSize}
}

function initTestTexture (textureSize) {
  const size = textureSize.x * textureSize.y
  const data = new Float32Array(4 * size)
  for (let i = 0; i < data.length; ++i) data[i] = 0
  for (let pos = new THREE.Vector2(0, 0); pos.y < textureSize.y; ++pos.y) {
    let i = pos.y * textureSize.x * 4
    const shapeCount = 1
    for (let shapeIndex = 0; shapeIndex < shapeCount; ++shapeIndex) {
      const shapeType = Math.floor(Math.random() * 2)
      const xyz = new THREE.Vector3(pos.y, 0, 0)
      // data[i++] = 255
      // data[i++] = Math.floor(255 * (pos.y / textureSize.y))
      // data[i++] = 0
      // data[i++] = 255
      data[i++] = xyz.x
      data[i++] = xyz.y
      data[i++] = xyz.z
      data[i++] = shapeType
      switch (shapeType) {
        case 0: // Sphere
          data[i++] = Math.random() // Radius
          data[i++] = 0
          data[i++] = 0
          data[i++] = 0
          break
        case 1: // Box
          data[i++] = Math.random() // Width
          data[i++] = Math.random() // Height
          data[i++] = Math.random() // Depth
          data[i++] = 0
          break
      }
    }
  }
  const texture = new THREE.DataTexture(data, textureSize.x, textureSize.y, THREE.RGBAFormat, THREE.FloatType)
  texture.needsUpdate = true
  return texture
}
