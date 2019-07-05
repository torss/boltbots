import { btileLoaderItemsCreate, TiSh } from '../btile'
import { LoaderControl, LoaderItem } from '../LoaderControl'
import { initTiTys, initTestGame } from './content'

/**
 * Primary game managing instance.
 */
export class Game {
  constructor () {
    this.ready = false
    this.readyFunc = undefined
    this.tiTys = undefined
    this.models = {}
    this.map = undefined
    this.match = undefined
    this.scene = undefined // THREE.Scene
    this.envMap = undefined // THREE
    this.threeTest = undefined // THREE.* test data (envMap)
  }

  asyncInit () {
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
    // TODO
  }

  /**
   * Progress within turn (next player)
   */
  progressTurn () {
    const match = this.match
    ++match.turnPlayerIndex
    // match.turnPlayer.bot.object3d.position.z += 1
    const card = match.turnPlayer.cardSlots[0].card
    if (card) card.invoke(this)
    // TODO
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
