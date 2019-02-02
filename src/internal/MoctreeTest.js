/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import * as SimplexNoise from 'simplex-noise'
import {Moctree, moctCubeSides} from './Moctree'

class MoctIterTtb {
  constructor (moctNode) {
    this.node = undefined
    this.origin = undefined
    this.subIters = [new MoctIterTtbSub(moctNode)]
  }

  next () {
    const subIters = this.subIters
    for (let subIter; (subIter = subIters[subIters.length - 1]);) {
      const moctNodeNext = subIter.next().value
      if (!moctNodeNext) {
        subIters.pop()
        continue
      }
      if (moctNodeNext.isLeaf) {
        this.node = moctNodeNext
        this.origin = subIter.origin
        return this
      }
      subIter = new MoctIterTtbSub(moctNodeNext, subIter)
      subIters.push(subIter)
    }
    return undefined
  }
}

class MoctIterTtbSub {
  constructor (moctNode, parent) {
    this.moctNode = moctNode
    this.index = -1
    this.value = undefined
    this.parentOrigin = parent
      ? parent.origin.clone()
      : (moctNode.isTln ? moctNode.moctree.origin.clone() : new THREE.Vector3(0, 0, 0))
    this.origin = new THREE.Vector3(0, 0, 0)
  }

  next () {
    ++this.index
    if (this.moctNode.isLeaf) this.value = this.index >= 1 ? undefined : this.moctNode
    else this.value = this.index >= 8 ? undefined : this.moctNode.subs[this.index]
    if (this.value) {
      this.origin.copy(this.parentOrigin).addScaledVector(this.value.octant.direction, this.value.level.scale)
    }
    return this
  }
}

function meshMoctree (moctree) {
  const geometry = new THREE.BufferGeometry()
  const vertices = []
  const normals = []
  const pushFace = (origin, scale, moctCubeSide) => {
    const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))
    points[0].pushOnto(vertices)
    points[1].pushOnto(vertices)
    points[2].pushOnto(vertices)
    points[1].pushOnto(vertices)
    points[3].pushOnto(vertices)
    points[2].pushOnto(vertices)
    for (let i = 0; i < 6; ++i) moctCubeSide.normal.pushOnto(normals)
  }
  for (let iterTtb = new MoctIterTtb(moctree.tln); iterTtb.next();) {
    const moctNode = iterTtb.node
    const origin = iterTtb.origin
    if (moctNode.material === undefined) continue
    const level = moctNode.level
    const scale = level.scale
    moctCubeSides.forEach(moctCubeSide => {
      const side = moctNode.sides[moctCubeSide.index]
      if (side.isVisible) pushFace(origin, scale, moctCubeSide)
    })
  }
  geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  return geometry
}

export function moctreeTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.20,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 10
  })
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff2200,
    metalness: 0.95,
    roughness: 0.05,
    envMap: materialParam.envMap,
    envMapIntensity: 1
  })

  const moctree = new Moctree()
  genMoctree3(moctree, material)

  console.time('meshMoctree')
  const geometry = meshMoctree(moctree)
  console.timeEnd('meshMoctree')
  var mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material2))
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
