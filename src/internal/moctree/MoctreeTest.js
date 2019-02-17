/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import '../extensions/three/Vector3'
import * as SimplexNoise from 'simplex-noise'
import {Moctree, MoctOctant, MoctMesher} from '.'

export function moctreeTest (vueInstance, scene, camera, materialParam) {
  const moctree = new Moctree()
  const testMesher = new MoctreeTestMesher(scene, moctree, materialParam)
  genMoctreeEdit0(moctree, testMesher.material)
  testMesher.remesh()
  initEditTestControls(vueInstance, scene, camera, moctree, materialParam, testMesher)
}

class MoctreeTestMesher {
  constructor (scene, moctree, materialParam) {
    this.scene = scene
    this.moctree = moctree
    this.material = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.20,
      roughness: 0.80,
      envMap: materialParam.envMap,
      envMapIntensity: 10
    })
    this.material2 = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff2200,
      metalness: 0.95,
      roughness: 0.05,
      envMap: materialParam.envMap,
      envMapIntensity: 1
    })
    this.mesh = undefined
    this.wireframe = undefined
  }

  remesh () {
    const {scene, moctree, material, material2} = this
    console.time('meshMoctree')
    const geometry = new MoctMesher(moctree).mesh()
    console.timeEnd('meshMoctree')
    if (this.mesh) scene.remove(this.mesh)
    if (this.wireframe) scene.remove(this.wireframe)
    this.mesh = new THREE.Mesh(geometry, material)
    scene.add(this.mesh)
    this.wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material2)
    scene.add(this.wireframe)
  }
}

function genMoctreeEdit0 (moctree, material) {
  console.time('Moctree construction - genMoctreeEdit0')
  let node = moctree.tln
  node.material = material
  // node.split().subs[0].material = undefined
  console.timeEnd('Moctree construction - genMoctreeEdit0')
}

function genMoctree3 (moctree, material, depth = 6) {
  console.time('Moctree construction - genMoctree3')
  const step = 1 / (1 << depth)
  const range = [-1 + step / 2, 1 - step / 2]
  const position = new THREE.Vector3()
  const seed = Math.random()
  const simplex = new SimplexNoise(seed)
  for (position.z = range[0]; position.z < range[1]; position.z += step) {
    for (position.x = range[0]; position.x < range[1]; position.x += step) {
      position.y = simplex.noise2D(position.z, position.x)
      for (;position.y > range[0]; position.y -= step) moctree.getAt(position, depth).material = material
    }
  }
  console.timeEnd('Moctree construction - genMoctree3')
}

function genMoctree2 (moctree, material, depth = 5) {
  console.time('Moctree construction - genMoctree2')
  const step = 1 / (1 << depth)
  const range = [-1 + step / 2, 1 - step / 2]
  const position = new THREE.Vector3()
  const center = new THREE.Vector3(0, 0, 0)
  const radius = 0.5
  for (position.z = range[0]; position.z < range[1]; position.z += step) {
    for (position.y = range[0]; position.y < range[1]; position.y += step) {
      for (position.x = range[0]; position.x < range[1]; position.x += step) {
        const distance = center.distanceTo(position)
        if (distance < radius) moctree.getAt(position, depth).material = material
      }
    }
  }
  console.timeEnd('Moctree construction - genMoctree2')
}

function genMoctree1 (moctree, material) {
  console.time('Moctree construction - genMoctree1')
  for (let j = 0; j < 100; ++j) {
    const position = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
    moctree.getAt(position, 2 + Math.floor(Math.random() * 4)).material = material
  }
  console.timeEnd('Moctree construction - genMoctree1')
}

function genMoctree0 (moctree, material) {
  moctree.tln.material = material
  console.time('Moctree construction - genMoctree0')
  for (let j = 0; j < 5000; ++j) {
    let sub = moctree.tln
    const outerSides = sub.octant.outerSides
    const outerSide = outerSides[Math.floor(Math.random() * outerSides.length)]
    const depth = 3 + Math.round(Math.random() * 5) // 24 + Math.round(Math.random() * 10)
    for (let i = 0; i < depth; ++i) {
      // sub = sub.split().subs[7]
      // sub = sub.split().subs[Math.floor(Math.random() * 8)]
      sub = sub.split().subs[outerSide.octants[Math.floor(Math.random() * outerSide.octants.length)].index]
      // sub.parent.subs[Math.floor(Math.random() * 8)].material = undefined
    }
    sub.material = undefined
  }
  console.timeEnd('Moctree construction - genMoctree0')
}

function initEditTestControls (vueInstance, scene, camera, moctree, materialParam, testMesher) {
  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const material = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xaa1100,
    metalness: 0.95,
    roughness: 0.05,
    transparent: true,
    opacity: 0.75,
    envMap: materialParam.envMap,
    envMapIntensity: 1
  })
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xff22ff,
    emissive: 0xaa1122,
    metalness: 0.95,
    roughness: 0.05,
    transparent: true,
    opacity: 0.75,
    envMap: materialParam.envMap,
    envMapIntensity: 1
  })
  const sphere = new THREE.Mesh(geometry, material)
  const sphere2 = new THREE.Mesh(geometry, material2)
  let rayOriginChain = []
  let nodeOriginChain = []
  const adjustChain = (points, meshes, chainMaterial) => {
    scene.remove(...meshes)
    meshes.length = 0
    meshes.push(...points.map(point => {
      const sphereTmp = new THREE.Mesh(geometry, chainMaterial)
      sphereTmp.scale.setScalar(0.005)
      sphereTmp.position.copy(point)
      scene.add(sphereTmp)
      return sphereTmp
    }))
  }
  sphere.visible = false
  sphere2.visible = false
  sphere.scale.setScalar(0.01)
  sphere2.scale.setScalar(0.01)
  scene.add(sphere)
  scene.add(sphere2)
  const editTarget = new THREE.Vector3(Infinity, Infinity, Infinity)
  let moctRaycast, ray
  function recastRay () {
    const hit = moctRaycast.run(ray, (moctNode) => !!moctNode.material)
    if (hit) {
      editTarget.copy(hit.nodeOrigin)
      sphere2.position.copy(editTarget)
      sphere2.visible = true
      sphere.position.copy(hit.ray.origin)
      sphere.visible = true

      adjustChain(hit.rayOriginChain, rayOriginChain, material)
      adjustChain(hit.nodeOriginChain, nodeOriginChain, material2)
    }
  }
  function onMousemove (event) {
    if (!testMesher.mesh.visible) return
    const mouse = new THREE.Vector2()
    const rect = event.target.getBoundingClientRect()
    mouse.x = ((event.clientX - Math.round(rect.left)) / event.target.clientWidth) * 2 - 1
    mouse.y = -((event.clientY - Math.round(rect.top)) / event.target.clientHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, camera)
    const target = raycaster.ray.intersectBox(moctree.createBoundingBox(), new THREE.Vector3())
    sphere2.visible = false
    sphere.visible = false
    if (target) {
      // sphere.position.copy(target)
      moctRaycast = new MoctRaycast(moctree)
      ray = new THREE.Ray(target, raycaster.ray.direction)
      recastRay()
    }
  }
  function onMousedown (event) {
    if (event.button === 1) {
      testMesher.mesh.visible = !testMesher.mesh.visible
      return
    }
    if (!sphere2.visible) return
    if (!testMesher.mesh.visible) return
    if (event.button === 0) {
      const node = moctree.getAt(editTarget)
      node.material = undefined
    } else if (event.button === 2) {
      const node = moctree.getAt(editTarget)
      node.split()
    }
    recastRay()
    testMesher.remesh()
  }
  function onKeydown (event) {
    if (event.key === 't') {
      recastRay()
    }
  }
  vueInstance.$onMousemove = onMousemove
  vueInstance.$onMousedown = onMousedown
  vueInstance.$onKeydown = onKeydown
}

// See https://daeken.svbtle.com/a-stupidly-simple-fast-octree-traversal-for-ray-intersection
class MoctRaycast {
  constructor (moctree) {
    this.moctree = moctree
  }

  // TODO This still seems to have some kind of bug that causes incorrect misses/hits!
  run (ray, acceptWhen, moctNode, nodeOrigin) {
    if (!moctNode) {
      moctNode = this.moctree.tln
      nodeOrigin = this.moctree.origin
    }
    if (moctNode.isLeaf) return acceptWhen(moctNode) ? {ray, moctNode, nodeOrigin, axisChain: [], rayOriginChain: [], nodeOriginChain: [], sidesChain: [], distancesChain: [], orderChain: []} : undefined
    const sides = new THREE.Vector3().subVectors(ray.origin, nodeOrigin).applyFunction(({value}) => value >= 0)
    const distances = new THREE.Vector3().applyFunction(({axis}) => {
      if (sides[axis] === (ray.direction[axis] < 0)) {
        const normal = new THREE.Vector3()
        normal[axis] = -1
        const plane = new THREE.Plane(normal, nodeOrigin[axis])
        const distance = ray.distanceToPlane(plane)
        return distance === null ? Infinity : distance
      } else {
        return Infinity
      }
    })
    const order = new THREE.Vector3('x', 'y', 'z')
    if (distances[order.y] < distances[order.x]) order.swapTwoAxes('x', 'y')
    if (distances[order.z] < distances[order.y]) {
      order.swapTwoAxes('y', 'z')
      if (distances[order.y] < distances[order.x]) order.swapTwoAxes('x', 'y')
    }
    const nextRay = new THREE.Ray(new THREE.Vector3().copy(ray.origin), ray.direction)
    const scaleHalf = moctNode.level.scaleHalf
    const scaleQuarter = moctNode.level.child.scaleHalf
    for (let axis of ['x', 'y', 'z']) {
      axis = order[axis]
      const octant = MoctOctant.bySides(sides)
      const nextNode = moctNode.subs[octant.index]
      const nextNodeOrigin = new THREE.Vector3().copy(nodeOrigin)
      nextNodeOrigin.addScaledVector(octant.direction, scaleQuarter)
      const result = this.run(nextRay, acceptWhen, nextNode, nextNodeOrigin)
      if (result) {
        result.rayOriginChain.push(ray.origin.clone())
        result.nodeOriginChain.push(nodeOrigin.clone())
        result.sidesChain.push(sides.clone())
        result.distancesChain.push(distances.clone())
        result.orderChain.push(order.clone())
        result.axisChain.push(axis)
        return result
      }
      const minDist = distances[axis]
      if (minDist === Infinity) return
      ray.at(minDist, nextRay.origin) // nextRay.origin.copy(ray.origin).addScaledVector(ray.direction, minDist)
      if (!new THREE.Vector3().subVectors(nextRay.origin, nodeOrigin).isWithinOriginCube(scaleHalf)) return
      sides[axis] = !sides[axis]
    }
  }
}
