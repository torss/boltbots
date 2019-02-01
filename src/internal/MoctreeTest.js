/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import {Moctree, moctCubeSides} from './Moctree'

class MoctIterTtb {
  constructor (moctNode) {
    this.value = undefined
    this.subIters = [new MoctIterTtbSub(moctNode)]
  }

  next () {
    const subIters = this.subIters
    for (; (this.value = subIters[subIters.length - 1]);) {
      const moctNodeNext = this.value.next().value
      if (!moctNodeNext) {
        subIters.pop()
        continue
      }
      this.value = new MoctIterTtbSub(moctNodeNext, this.value)
      if (moctNodeNext.isLeaf) return this.value.next()
      subIters.push(this.value)
    }
    return undefined
  }
}

class MoctIterTtbSub {
  constructor (moctNode, parent) {
    this.moctNode = moctNode
    this.index = -1
    this.value = undefined
    this.origin = parent
      ? parent.origin.clone().addScaledVector(moctNode.octant.scale, moctNode.level.scale)
      : (moctNode.level.depth === 0 ? moctNode.moctree.origin.clone() : new THREE.Vector3(0, 0, 0))
  }

  next () {
    ++this.index
    if (this.moctNode.isLeaf) this.value = this.index >= 1 ? undefined : this.moctNode
    else this.value = this.index >= 8 ? undefined : this.moctNode.subs[this.index]
    return this
  }
}

function meshMoctree (moctree) {
  const geometry = new THREE.BufferGeometry()
  const vertices = []
  const normals = []
  // const pushV3 = (v3) => vertices.push(v3.x, v3.y, v3.z)
  const pushFace = (origin, scale, moctCubeSide) => {
    // const v3a = new THREE.Vector3()
    // const v3b = new THREE.Vector3()

    const points = moctCubeSide.faceDrawCc.map(facePoint => origin.clone().addScaledVector(facePoint, scale))

    points[0].pushOnto(vertices)
    points[1].pushOnto(vertices)
    points[2].pushOnto(vertices)
    points[1].pushOnto(vertices)
    points[3].pushOnto(vertices)
    points[2].pushOnto(vertices)
    for (let i = 0; i < 6; ++i) moctCubeSide.normal.pushOnto(normals)
    // const push = (x, y, z) => pushV3(v3a.copy(origin).add(v3b.copy(face).multiplyScalars(x, y, z)))
    // push(-scale, -scale, +scale)
    // push(+scale, -scale, +scale)
    // push(+scale, +scale, +scale)
    // push(+scale, +scale, +scale)
    // push(-scale, +scale, +scale)
    // push(-scale, -scale, +scale)
  }
  for (let iterTtb = new MoctIterTtb(moctree.tln), iterSub; (iterSub = iterTtb.next());) {
    const moctNode = iterSub.value
    if (moctNode.material === undefined) continue
    const level = moctNode.level
    const scale = level.scale
    moctCubeSides.forEach(moctCubeSide => {
      const side = moctNode.sides[moctCubeSide.index]
      if (side.isVisible) pushFace(iterSub.origin, scale, moctCubeSide)
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
  moctree.tln.material = material

  for (let j = 0; j < 16; ++j) {
    let sub = moctree.tln
    const outerSides = sub.octant.outerSides
    const outerSide = outerSides[Math.floor(Math.random() * outerSides.length)]
    for (let i = 0; i < 4; ++i) {
      // sub = sub.split().subs[7]
      // sub = sub.split().subs[Math.floor(Math.random() * 8)]
      sub = sub.split().subs[outerSide.octants[Math.floor(Math.random() * outerSide.octants.length)].index]
      // sub.parent.subs[Math.floor(Math.random() * 8)].material = undefined
    }
    sub.material = undefined
  }

  const geometry = meshMoctree(moctree)
  var mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
  scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material2))
}
