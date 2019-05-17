/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import '../extensions/three'
import { BufferSet } from './BufferSet'
import { createVoxdar, modVoxdar, voxdarSideLength, meshVoxdar } from '.'
import { surfaceNets } from './SurfaceNets'

function testConstruct2 (scene) {
  const res = 14
  const iterCount = 10
  const mesher = surfaceNets

  const nr = 2 * res + 1,
    volume = new Float32Array(nr * nr * nr),
    dims = new Int32Array([nr, nr, nr])

  function initVolume (freq) {
    let n = 0, s = 0.5 * freq * Math.PI / res
    for (let z = -res; z <= res; ++z) {
      for (let y = -res; y <= res; ++y) {
        for (let x = -res; x <= res; ++x, ++n) {
          volume[n] = Math.sin(s * x) + Math.sin(s * y) + Math.sin(s * z)
          // volume[n] = Math.sin(s * x) * (Math.sin(s * y) + Math.sin(s * z))
          // volume[n] = (new THREE.Vector3(x, y, z).length() - 10) + Math.sin(s * x) * 2 + Math.sin(s * y) + Math.sin(s * z)
        }
      }
    }
  }

  // Warm up run on noisy volume, try to get JIT to compile meser
  initVolume(res / 4.0)
  for (let i = 0; i < iterCount; ++i) {
    mesher(volume, dims)
  }

  console.time('tvoxel-testConstruct-2-mesher')
  const result = mesher(volume, dims)
  console.timeEnd('tvoxel-testConstruct-2-mesher')

  console.time('tvoxel-testConstruct-2-geometry')
  const geometry = new THREE.Geometry()
  geometry.vertices.length = 0
  geometry.faces.length = 0

  for (let i = 0; i < result.vertices.length; ++i) {
    const v = result.vertices[i]
    geometry.vertices.push(new THREE.Vector3(v[0], v[1], v[2]))
  }

  for (let i = 0; i < result.faces.length; ++i) {
    const f = result.faces[i]
    if (f.length === 3) {
      geometry.faces.push(new THREE.Face3(f[0], f[1], f[2]))
    } else if (f.length === 4) {
      // geometry.faces.push(new THREE.Face4(f[0], f[1], f[2], f[3]))
      geometry.faces.push(new THREE.Face3(f[0], f[1], f[2]), new THREE.Face3(f[0], f[2], f[3]))
    } else {
      console.error('Polygon needs to be subdivided')
    }
  }

  const cb = new THREE.Vector3(), ab = new THREE.Vector3()
  for (let i = 0; i < geometry.faces.length; ++i) {
    const f = geometry.faces[i]
    const vA = geometry.vertices[f.a]
    const vB = geometry.vertices[f.b]
    const vC = geometry.vertices[f.c]
    cb.subVectors(vC, vB)
    ab.subVectors(vA, vB)
    cb.cross(ab)
    cb.normalize()
    f.normal.copy(cb)
    // if (result.faces[i].length === 3) {
    //   f.normal.copy(cb)
    //   continue
    // }

    // // quad
    // if (cb.isZero()) {
    //   // broken normal in the first triangle, let's use the second triangle
    //   const vA = geometry.vertices[f.a]
    //   const vB = geometry.vertices[f.c]
    //   const vC = geometry.vertices[f.d]
    //   cb.sub(vC, vB)
    //   ab.sub(vA, vB)
    //   cb.cross(ab)
    //   cb.normalize()
    // }
    // f.normal.copy(cb)
  }

  geometry.verticesNeedUpdate = true
  geometry.elementsNeedUpdate = true
  geometry.normalsNeedUpdate = true

  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  const material = new THREE.MeshNormalMaterial()
  const surfacemesh = new THREE.Mesh(geometry, material)
  surfacemesh.doubleSided = true
  const wirematerial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true
  })
  const wiremesh = new THREE.Mesh(geometry, wirematerial)
  wiremesh.doubleSided = true
  scene.add(surfacemesh)
  // scene.add(wiremesh)

  const bb = geometry.boundingBox
  wiremesh.position.x = surfacemesh.position.x = -(bb.max.x + bb.min.x) / 2.0
  wiremesh.position.y = surfacemesh.position.y = -(bb.max.y + bb.min.y) / 2.0
  wiremesh.position.z = surfacemesh.position.z = -(bb.max.z + bb.min.z) / 2.0
  console.timeEnd('tvoxel-testConstruct-2-geometry')
}

export function tvoxelTest (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  const testMaterial = new THREE.MeshBasicMaterial({
    vertexColors: THREE.VertexColors
  })

  const bufferSet = new BufferSet()
  const voxdar = testConstruct(bufferSet)

  // for (let i = 0; i < 100; ++i) testConstruct(new BufferSet()) // Timer test
  const testBufferSet = new BufferSet()
  for (let i = 0; i < 10; ++i) {
    testConstruct(testBufferSet, voxdar) // Timer test
    testBufferSet.clear()
  }
  const mesh = new THREE.Mesh(bufferSet.fitSize().createGeometry(), testMaterial)
  // scene.add(mesh)

  testConstruct2(scene)

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
