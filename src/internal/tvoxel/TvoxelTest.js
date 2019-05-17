/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import '../extensions/three'
import {BufferSet} from './BufferSet'
import {createVoxdar, modVoxdar, voxdarSideLength, meshVoxdar} from '.'

export function tvoxelTest (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  const bufferSet = new BufferSet()
  const voxdar = testConstruct(bufferSet)

  // for (let i = 0; i < 100; ++i) testConstruct(new BufferSet()) // Timer test
  const testBufferSet = new BufferSet()
  for (let i = 0; i < 10; ++i) {
    testConstruct(testBufferSet, voxdar) // Timer test
    testBufferSet.clear()
  }

  const testMaterial = new THREE.MeshBasicMaterial({
    vertexColors: THREE.VertexColors
  })
  const mesh = new THREE.Mesh(bufferSet.fitSize().createGeometry(), testMaterial)
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

function testConstruct (bufferSet, voxdar = undefined) {
  if (!voxdar) {
    console.time('tvoxel-testConstruct-1-create-voxdar')
    voxdar = createVoxdar()
    modVoxdar(voxdar, (value, pos) => {
      // return pos.length() < (voxdarSideLength / 2) ? 1 : undefined
      return new THREE.Vector3().copy(pos).subScalar(voxdarSideLength / 2).length() < (voxdarSideLength / 2) ? 1 : undefined
    })
    console.timeEnd('tvoxel-testConstruct-1-create-voxdar')
  }
  console.time('tvoxel-testConstruct-1-mesh')
  meshVoxdar(voxdar, bufferSet)
  console.timeEnd('tvoxel-testConstruct-1-mesh')
  return voxdar
}
