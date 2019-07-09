import * as THREE from 'three'
import { assignNewVueObserver } from '../Dereactivate'

export class ControlTower {
  constructor () {
    assignNewVueObserver(this)
    this.position = new THREE.Vector3()
  }
}
