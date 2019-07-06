import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { btileLoaderItemsCreate, TiSh } from '../btile'
import { LoaderControl, LoaderItem } from '../LoaderControl'
import { initTiTys, initTestGame } from './content'
import { assignNewVueObserver } from '../Dereactivate'

/**
 * Primary game managing instance.
 */
export class Game {
  constructor () {
    this.ready = false
    this.match = undefined
    assignNewVueObserver(this)

    this.readyFunc = undefined
    this.tiTys = undefined
    this.models = {}
    this.scene = undefined // THREE.Scene
    this.envMap = undefined // THREE
    this.threeTest = undefined // THREE.* test data (envMap)
  }

  asyncInit () {
    // Lazor Orb
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: new THREE.Color(0.5, 0.25, 0),
      metalness: 0.99,
      roughness: 0.01,
      envMapIntensity: 1
    })
    this.models['lazor-orb'] = new THREE.Mesh(new THREE.SphereBufferGeometry(0.020, 32, 32), material)
    new TWEEN.Tween(material.emissive)
      .to(new THREE.Color(0.75, 0.5, 0.1), 750)
      .repeat(Infinity)
      .yoyo(true)
      .easing(TWEEN.Easing.Bounce.InOut)
      .start()
    // - //

    const btileLoaderItems = btileLoaderItemsCreate()
    const tankLoaderItem = new LoaderItem('../statics/models/vehicle/TestTank.glb', 'Bot')
    const loaderItems = [...btileLoaderItems, tankLoaderItem]
    const loaderControl = new LoaderControl(loaderItems, (success, loaderControl) => {
      if (!success) {
        console.error('loaderControl failed')
        return
      }

      const tiShs = {}
      for (const item of btileLoaderItems) {
        tiShs[item.name] = new TiSh(item.gltf.scene)
      }
      this.tiTys = initTiTys(tiShs)

      finishTankLoaderItem(tankLoaderItem, this)

      initTestGame(this)
      this.ready = true
      if (this.readyFunc) this.readyFunc(this)
    })
    loaderControl.start()

    // btileInit(({ tiShs }) => {
    //   this.tiTys = initTiTys(tiShs)
    //   initTestGame(this)
    //   this.ready = true
    // })
  }

  nextTurn () {
    const match = this.match
    match.turnPlayerIndex = -1
    this.progressTurn()
  }

  /**
   * Progress within turn (next player)
   */
  progressTurn () {
    const match = this.match
    ++match.turnPlayerIndex
    if (match.turnPlayer) {
      // match.turnPlayer.bot.object3d.position.z += 1
      match.turnPlayer.bot.cardStart()
    }
  }

  cardAllDone (bot) {
    this.progressTurn()
  }
}

function finishTankLoaderItem (loaderItem, game) {
  const gltf = loaderItem.gltf
  gltf.scene.traverseVisible(obj => {
    if (obj.isMesh) {
      // obj.material = material
      obj.castShadow = true
      obj.receiveShadow = true
    }
  })
  game.models[loaderItem.name] = gltf.scene
}
