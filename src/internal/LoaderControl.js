import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

export class LoaderItem {
  constructor (path, name, loadedFunc) {
    this.path = path
    this.name = name
    this.status = 'unprocessed'
    this.loadedFunc = loadedFunc
    this.result = undefined
  }
}

export class LoaderItemGltf extends LoaderItem {
  get loaderKey () { return 'gltfLoader' }

  get gltf () {
    return this.status === 'done' ? this.result : undefined
  }
}
LoaderItemGltf.loaderKey = 'gltfLoader'

export class LoaderItemFont extends LoaderItem {
  get loaderKey () { return 'fontLoader' }

  get font () {
    return this.status === 'done' ? this.result : undefined
  }
}

export class LoaderControl {
  constructor (items = [], allDoneFunc) {
    this.items = items
    this.countDone = 0
    this.countError = 0
    this.gltfLoader = new GLTFLoader()
    this.fontLoader = new THREE.FontLoader()
    this.allDoneFunc = allDoneFunc
  }

  get countTotal () {
    return this.countDone + this.countError
  }

  start () {
    for (const item of this.items) {
      if (item.status === 'unprocessed') {
        item.status = 'loading'
        const loader = this[item.loaderKey]
        loader.load(item.path, (result) => {
          ++this.countDone
          item.status = 'done'
          item.result = result
          if (item.loadedFunc) item.loadedFunc(item, this)
          if (this.allDoneFunc) {
            if (this.countDone === this.items.length) this.allDoneFunc(true, this) // all done - full success
            else if (this.countTotal === this.items.length) this.allDoneFunc(false, this) // all done - at least one failed
          }
        }, undefined, (errorEvent) => {
          ++this.countError
          item.status = 'error'
          item.result = errorEvent
        })
      }
    }
  }
}
