import { btileInit } from '../btile'
import { initTiTys, initTestGame } from './content'

/**
 * Primary game managing instance.
 */
export class Game {
  constructor () {
    this.ready = false
    this.tiTys = undefined
    this.match = undefined
    this.scene = undefined // THREE.Scene
    this.envMap = undefined // THREE
    this.threeTest = undefined // THREE.* test data (envMap)
  }

  asyncInit () {
    btileInit(({ tiShs }) => {
      this.tiTys = initTiTys(tiShs)
      initTestGame(this)
      this.ready = true
    })
  }
}
