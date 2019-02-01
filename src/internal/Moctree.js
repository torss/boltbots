/**
 * @author torss / https://github.com/torss
 *
 * Mighty Magical Merging Octree (that is hopefully Magnificent too)
 */

import * as THREE from 'three'

export const moctCubeSides = []
export const moctOctants = []

/**
 * Moctree constant Cube Side info
 */
export class MoctCubeSide {
  constructor (coord, sign) {
    this.index = -1
    this.coord = coord // Coordinate key
    this.compCoords = 'xyz'.split('').filter(k => k !== coord) // Complementary coordinate keys
    this.sign = sign
    this.normal = new THREE.Vector3(0, 0, 0)
    this.normal[coord] = sign
    this.complement = undefined // Must be set after all MoctCubeSide were created
    this.octants = undefined // Must be created after all regular MoctOctants were created

    this.face = []
    const scale = 1
    const range = [-scale, scale]
    for (const a of range) {
      for (const b of range) {
        const vert = new THREE.Vector3(0, 0, 0)
        vert[this.compCoords[0]] = a
        vert[this.compCoords[1]] = b
        vert[this.coord] = scale * sign
        this.face.push(vert)
      }
    }

    // Draw couner-clockwise
    if ((sign > 0) !== (coord !== 'y')) {
      this.faceDrawCc = this.face
    } else {
      this.faceDrawCc = this.face.slice()
      this.faceDrawCc[1] = this.face[2]
      this.faceDrawCc[2] = this.face[1]
    }
  }

  completeCubeSide () {
    this.complement = MoctCubeSide.byCoordSign(this.coord, -this.sign)
    this.octants = this.face.map(vert => MoctOctant.byDirection(vert.clone())) // Assumes face was created with scale = 1
  }

  // static byNormal (normal) {
  //   return moctCubeSides.find(moctCubeSide => moctCubeSide.normal.equals(normal))
  // }

  static byCoordSign (coord, sign) {
    const moctCubeSide = moctCubeSides[new THREE.Vector3(0, 2, 4)[coord] + (sign > 0 ? 1 : 0)]
    if (!moctCubeSide) return undefined
    if (moctCubeSide.coord !== coord || (moctCubeSide.sign > 0) !== (sign > 0)) {
      throw new Error('MoctCubeSide.byCoordSign sanity check failed: moctCubeSides order broken!')
    }
    return moctCubeSide
  }
}

for (const coord of 'xyz') {
  for (const sign of [-1, 1]) moctCubeSides.push(new MoctCubeSide(coord, sign))
}
for (let i = 0; i < moctCubeSides.length; ++i) moctCubeSides[i].index = i

/**
 * Moctree constant Octant info
 */
export class MoctOctant {
  constructor (x, y, z, index = -1) {
    this.index = index
    this.direction = new THREE.Vector3(x, y, z)
    this.outerSides = undefined // Differs between the regular and special MoctOctants
    this.neighbors = undefined // Must be created after all regular MoctOctants were created
  }

  completeRegularOctant () {
    this.outerSides = 'xyz'.split('').map(coord => MoctCubeSide.byCoordSign(coord, this.direction[coord]))
    this.neighbors = 'xyz'.split('').map(coord => {
      const dir = this.direction.clone()
      dir[coord] *= -1
      return {
        side: MoctCubeSide.byCoordSign(coord, dir[coord]),
        octant: MoctOctant.byDirection(dir)
      }
    })
  }

  get scale () {
    return this.direction
  }

  static byDirection (direction) {
    const moctOctant = moctOctants[(direction.x > 0 ? 1 : 0) + (direction.y > 0 ? 2 : 0) + (direction.z > 0 ? 4 : 0)]
    if (!moctOctant) return undefined
    if (!moctOctant.direction.equals(direction)) {
      throw new Error('MoctOctant.byDirection sanity check failed: moctOctants order broken!')
    }
    return moctOctant
  }
}

{
  let index = -1
  const range = [-1, 1]
  for (const z of range) {
    for (const y of range) {
      for (const x of range) {
        moctOctants.push(new MoctOctant(x, y, z, ++index))
      }
    }
  }
}

for (const moctOctant of moctOctants) moctOctant.completeRegularOctant()
for (const moctCubeSide of moctCubeSides) moctCubeSide.completeCubeSide()

export const moctOctantTln = new MoctOctant(1, 1, 1) // Special top-level-node pseudo-octant
moctOctantTln.outerSides = moctCubeSides

/**
  * Primary Moctree control structure
  */
export class Moctree {
  constructor () {
    this.origin = new THREE.Vector3(0, 0, 0) // Center of the top-level-node
    this.scale = 1 // Scale of the top-level node
    this.tln = new MoctNode(new MoctLevel(this)) // Top-level-node
    this.lowestLevel = this.tln.level
  }
}

/**
 * Moctree general Level info
 */
export class MoctLevel {
  constructor (moctree, parent, child) {
    this.moctree = moctree
    this.parent = parent
    this.child = child
    this.update()
  }

  update () {
    const parent = this.parent
    if (parent) {
      this.depth = parent.depth + 1
      this.scale = parent.scaleHalf
    } else {
      this.depth = 0
      this.scale = this.moctree.scale
    }
    this.scaleHalf = this.scale / 2
    if (this.child) this.child.update()
    else this.moctree.lowestLevel = this
  }

  obtainChild () {
    if (!this.child) this.child = new MoctLevel(this.moctree, this)
    return this.child
  }
}

/**
 * Moctree Node
 */
export class MoctNode {
  constructor (level, parent, octant = moctOctantTln) {
    this.level = level
    this.parent = parent
    this.octant = octant
    this.subs = [] // Subdivisions (Child nodes)
    this.material_ = parent ? parent.material_ : undefined
    this.sides = moctCubeSides.map(moctCubeSide => new MoctNodeSide(this, moctCubeSide))
  }

  get material () {
    return this.material_
  }

  set material (material) {
    if (material === this.material_) return // Superfluous
    const wasVisible = this.isVisible
    this.material_ = material
    if (this.isVisible !== wasVisible && !this.isTln) {
      const offset = this.isVisible ? 1 : -1
      for (const outerSide of this.octant.outerSides) {
        // this.parent.sides[outerSide.index].visibleCount += offset
        this.parent.sides[outerSide.index].adjustVisibleCount(offset)
      }
    }
  }

  get moctree () {
    return this.level.moctree
  }

  // get siblings () {
  //   return this.parent.subs
  // }

  // get depth () {
  //   return this.level.moctree
  // }

  get isTln () {
    return !this.parent
  }

  get isLeaf () {
    return this.subs.length === 0
  }

  get isVisible () {
    return this.material_ !== undefined
  }

  split () {
    if (!this.isLeaf) return this
    const subLevel = this.level.obtainChild()
    for (let i = 0; i < 8; ++i) this.subs.push(new MoctNode(subLevel, this, moctOctants[i]))
    for (let i = 0; i < 8; ++i) {
      const sub = this.subs[i]
      for (const outerSide of sub.octant.outerSides) {
        sub.sides[outerSide.index].parent = this.sides[outerSide.index]
        sub.sides[outerSide.index].gedCon = this.sides[outerSide.index].gedCon
        // TODO adjust to lower level when possible
      }
      for (const nei of sub.octant.neighbors) {
        // sub.sides[nei.side.index].gedCon = this.subs[nei.octant.index]
        sub.sides[nei.side.index].gedCon = this.subs[nei.octant.index].sides[nei.side.complement.index]
      }
    }
    // for (const moctCubeSide of moctCubeSides) {
    //   const side = this.sides[moctCubeSide.index]
    //   side.visibleCount = 0
    //   for (const octant of moctCubeSide.octants) {
    //     if (this.subs[octant.index].isVisible) {
    //       ++side.visibleCount
    //     }
    //   }
    // }
    return this
  }
}

/**
 * Moctree Node Side
 */
export class MoctNodeSide {
  constructor (moctNode, moctCubeSide) {
    this.node = moctNode
    this.cubeSide = moctCubeSide
    this.visibleCount = moctNode.isVisible ? 4 : 0
    this.parent = undefined
    // this.visible = true
    // this.gedCon = undefined // "Greater-equal-depth" connection (this.depth <= other.depth) - A neighboring MoctNode or undefined
    this.gedCon = undefined // "Greater-equal-depth" connection (this.depth <= other.depth) - A complementing MoctNodeSide or undefined
  }

  adjustVisibleCount (offset) {
    const hadFullFace = this.fullFace
    this.visibleCount += offset
    if (hadFullFace !== this.fullFace && this.parent) {
      this.parent.adjustVisibleCount(offset)
    }
  }

  get fullFace () {
    return this.visibleCount === 4
  }

  // set gedCon (otherNode) {
  //   this.gedCon_ = otherNode
  //   this.visible = !otherNode || !otherNode.sides[this.cubeSide.complement.index].visible
  // }

  // get gedCon () {
  //   return this.gedCon_
  // }

  get isVisible () {
    // return this.visible && this.node.isVisible
    // return this.node.isVisible && (!this.gedCon || !this.gedCon.isVisible || !this.gedCon.sides[this.cubeSide.complement.index].fullFace)
    return this.node.isVisible && (!this.gedCon || !this.gedCon.node.isVisible || !this.gedCon.fullFace)
  }
}

/**
 * Moctree Visitor / Traverser
 */
// export class MoctVis {
//   constructor () {
//     this.TODO = 'TODO' // TODO
//   }
// }
