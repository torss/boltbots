/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './sample.vert.glsl'
import fragmentShader from './sample.frag.glsl'
import {moctCubeSides} from '../moctree'
import {BufferAttributeExtIndex, BufferAttributeExt} from '../extensions'

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

function initTestLsdfConfigs (count) {
  const randomA = () => 0.2 + Math.random() * 0.3 // 0.4
  const randomB = () => 0.2 + Math.random() * 0.2 // 0.3
  const genRandomSphere = (position) => ({type: 'sphere', position, radius: randomA()})
  const genRandomBox = (position) => ({type: 'box', position, size: new THREE.Vector3(randomB(), randomB(), randomB())})
  const genRandomSomething = (what, position) => what ? genRandomSphere(position) : genRandomBox(position)
  const combineBase = (type, x, y) => {
    if (type === 'union') {
      // Order independent, so re-order x, y by type string order if necessary
      if (x.type > y.type) {
        const z = x; x = y; y = z
      }
    }
    return {type, x, y}
  }
  const combineRandom = (what, x, y) => combineBase(what ? 'union' : 'subtract', x, y)
  const lsdfConfigs = []
  for (let i = 0; i < count; ++i) {
    const position = new THREE.Vector3(i, 0, 0)
    const what = Math.random() > 0.5
    lsdfConfigs.push(combineRandom(
      Math.random() > 0.66, // i % 2 === 0,
      genRandomSomething(what, position),
      genRandomSomething(!what, position)
    ))
  }
  return lsdfConfigs
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
  const lsdfConfigKindMap = {}
  for (const key of ['union', 'subtract']) lsdfConfigKindMap[key] = 'combine'
  const resolveConfig = (parent, lsdfConfig) => {
    const sub = upsertNode(parent, lsdfConfig.type)
    let resultType
    switch (lsdfConfigKindMap[lsdfConfig.type]) {
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
  const typeMapSizes = {
    'sphere': 1,
    'box': 2
  }
  const genTexMapAccess = (typeMapIndex) => {
    return 'texture(typeMap, vec2(vShapeType.x + (' + typeMapIndex + '. * typeMapTexelSize.x), vShapeType.y))'
  }
  const genPositionCode = (typeMapIndex) => {
    return 'position - ' + genTexMapAccess(typeMapIndex) + '.xyz'
  }
  const resolveCode = (lsdfConfig, resolveState = {typeMapIndex: 0}) => {
    const {typeMapIndex} = resolveState
    const typeMapSize = typeMapSizes[lsdfConfig.type] || 0
    let resultCode
    const combineFunc = (funcName) => {
      const x = resolveCode(lsdfConfig.x, resolveState)
      const y = resolveCode(lsdfConfig.y, resolveState)
      resultCode = funcName + '(' + x + ', ' + y + ')'
    }
    switch (lsdfConfig.type) {
      case 'union':
        combineFunc('opUnion')
        break
      case 'subtract':
        combineFunc('opSubtraction')
        break
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
  lsdfTypeLeaves.forEach((lsdfTypeLeaf, index) => {
    lsdfTypeLeaf.typeId = index
    lsdfTypeLeaf.shaderCode = resolveCode(lsdfTypeLeaf.users[0])
    for (const lsdfConfig of lsdfTypeLeaf.users) lsdfConfig.typeLeaf = lsdfTypeLeaf
    lsdfTypeLeaf.users = undefined
  })
  return {
    lsdfTypeRoot,
    lsdfTypeLeaves
  }
}

function adjustLsdfFragmentShader (material, lsdfTypeTree) {
  let shaderCode = ''
  for (const lsdfTypeLeaf of lsdfTypeTree.lsdfTypeLeaves) {
    shaderCode += '    case ' + lsdfTypeLeaf.typeId + 'u:\n      return ' + lsdfTypeLeaf.shaderCode + ';\n'
  }
  window.waw = lsdfTypeTree.lsdfTypeLeaves // FIXME debug only
  window.shaderCode = shaderCode // FIXME debug only
  material.fragmentShader = fragmentShader.replace('// [LSDF TYPE TARGET] //', shaderCode)
}

function initTestTextureFromLsdfConfigs (lsdfConfigs) {
  const textureSize = new THREE.Vector2(lsdfConfigs.length, lsdfConfigs.length)
  const size = textureSize.x * textureSize.y
  const data = new Float32Array(4 * size)
  for (let i = 0; i < data.length; ++i) data[i] = 0
  for (let lsdfConfigIndex = 0; lsdfConfigIndex < lsdfConfigs.length; ++lsdfConfigIndex) {
    let i = lsdfConfigIndex * textureSize.x * 4
    const lsdfConfig = lsdfConfigs[lsdfConfigIndex]
    for (const partKey of ['x', 'y']) {
      const shapeConfig = lsdfConfig[partKey]
      data[i++] = shapeConfig.position.x
      data[i++] = shapeConfig.position.y
      data[i++] = shapeConfig.position.z
      switch (shapeConfig.type) {
        case 'sphere':
          data[i++] = shapeConfig.radius
          break
        case 'box':
          data[i++] = 0
          data[i++] = shapeConfig.size.x
          data[i++] = shapeConfig.size.y
          data[i++] = shapeConfig.size.z
          data[i++] = 0
          break
      }
    }
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
