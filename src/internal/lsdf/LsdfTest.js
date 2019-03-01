/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import vertexShader from './sample.vert.glsl'
import fragmentShader from './sample.frag.glsl'
import {moctCubeSides} from '../moctree'
import {BufferAttributeExtIndex, BufferAttributeExt} from '../extensions'

export function lsdfTest (vueInstance, scene, camera, materialParam) {
  const material = new THREE.RawShaderMaterial({
    uniforms: {
      time: { value: 1.0 }
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
  const geometry = createCubeGeometry()
  const cube = new THREE.Mesh(geometry, material)
  scene.add(cube)
}

function createCubeGeometry () {
  const geometry = new THREE.BufferGeometry()
  const indices = new BufferAttributeExtIndex()
  const positions = new BufferAttributeExt(new Float32Array(), 3)
  const normals = new BufferAttributeExt(new Float32Array(), 3)
  const uvs = new BufferAttributeExt(new Float32Array(), 2)
  addCubeFaces(new THREE.Vector3(0, 0, 0), indices, positions, normals, uvs)
  geometry.setIndex(indices.fitSize())
  geometry.addAttribute('position', positions.fitSize())
  geometry.addAttribute('normal', normals.fitSize())
  geometry.addAttribute('uv', uvs.fitSize())
  return geometry
}

function addCubeFaces (origin, indices, positions, normals, uvs, scale = 0.5) {
  moctCubeSides.forEach((moctCubeSide) => {
    const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
    indices.pushRelative(0, 1, 2, 1, 3, 2)
    positions.pushVector3(points[0], points[1], points[2], points[3])
    const normal = moctCubeSide.normal
    normals.pushVector3(normal, normal, normal, normal)
    const uvRange = [-1, 1]
    uvRange.forEach(u => uvRange.forEach(v => uvs.pushVector2(new THREE.Vector2(u, v))))
  })
}
