/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import '../extensions/three'
import {BufferSet} from './BufferSet'
// import {testConstruct} from './approach0'
import {testConstruct} from './approach1'

export function conscepterTest (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  const bufferSet = new BufferSet()
  testConstruct(bufferSet)
  for (let i = 0; i < 10; ++i) testConstruct(new BufferSet()) // Timer test
  const mesh = new THREE.Mesh(bufferSet.fitSize().createGeometry(), material)
  scene.add(mesh)
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff2200,
    metalness: 0.95,
    roughness: 0.05,
    envMap: material.envMap,
    envMapIntensity: 1
  })
  // const meshWire = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), material2)
  // scene.add(meshWire)
  // const normalHelper = new THREE.VertexNormalsHelper(mesh, 0.05)
  // scene.add(normalHelper)
}
