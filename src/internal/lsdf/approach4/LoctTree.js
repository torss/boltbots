import * as THREE from 'three'
import { LoctNode } from './LoctNode'
import { LoctLevel } from './LoctLevel'

export class LoctTree {
  constructor () {
    this.origin = new THREE.Vector3(0, 0, 0) // Center of the top-level-node
    this.scale = 1 // Scale of the top-level node
    this.tln = new LoctNode(new LoctLevel(this)) // Top-level-node
    this.lowestLevel = this.tln.level
  }
}
