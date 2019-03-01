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
      typeMap: new THREE.Uniform()
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
  const textureSize = new THREE.Vector2(16, 16)
  const texture = initTestTexture(textureSize)
  material.uniforms.typeMap.value = texture
  for (let shapeIndex = 0; shapeIndex < textureSize.y; ++shapeIndex) {
    const shapeType = new THREE.Vector3(0.5 / textureSize.x, (0.5 / textureSize.y) + (shapeIndex / textureSize.y), 0)
    addCubeFaces(new THREE.Vector3(shapeIndex, 0, 0), shapeType, indices, positions, normals, uvs, shapeTypes)
  }
  geometry.setIndex(indices.fitSize())
  geometry.addAttribute('position', positions.fitSize())
  geometry.addAttribute('normal', normals.fitSize())
  geometry.addAttribute('uv', uvs.fitSize())
  geometry.addAttribute('shapeType', shapeTypes.fitSize())
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
  })
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
