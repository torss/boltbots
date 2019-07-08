import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { assignNewVueObserver } from '../Dereactivate'
import { btileLoaderItemsCreate, TiSh } from '../btile'
import { LoaderControl, LoaderItemFont, LoaderItemGltf } from '../LoaderControl'
import { initTiTys, initTestGame } from './content'
import { Sfxf } from '../Sfxf'
import { ExplosionShader } from '../shaders'

/**
 * Primary game managing instance.
 */
export class Game {
  constructor () {
    this.ready = false
    this.match = undefined
    assignNewVueObserver(this)

    this.sfxf = new Sfxf(this)
    this.readyFunc = undefined
    this.tiTys = undefined
    this.models = {}
    this.fonts = {}
    this.scene = undefined // THREE.Scene
    this.envMap = undefined // THREE
    this.audioListener = undefined // THREEE.AudioListener
    this.threeTest = undefined // THREE.* test data (envMap)
    this.explosionMaterial = undefined
    this.explosionGeometry = undefined
    this.clock = new THREE.Clock()
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
    // Explosion material & geometry
    this.explosionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tExplosion: {
          type: 't',
          value: new THREE.TextureLoader().load('../statics/textures/explosion/explosion.png')
        },
        time: {
          type: 'f',
          value: 0.0
        }
      },
      vertexShader: ExplosionShader.vertexShader,
      fragmentShader: ExplosionShader.fragmentShader
    })
    this.explosionGeometry = new THREE.IcosahedronGeometry(20, 4)
    // - //

    const btileLoaderItems = btileLoaderItemsCreate()
    const tankLoaderItem = new LoaderItemGltf('../statics/models/vehicle/TestTank.glb', 'Bot')
    const fontLoaderItems = [new LoaderItemFont('../statics/fonts/3d/droid/droid_sans_bold.typeface.json', 'Default')]
    const loaderItems = [...btileLoaderItems, tankLoaderItem, ...fontLoaderItems]
    const loaderControl = new LoaderControl(loaderItems, (success, loaderControl) => {
      if (!success) {
        console.error('loaderControl failed')
        return
      }

      for (const item of fontLoaderItems) this.fonts[item.name] = item.font

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

  // nextTurn () {
  //   const match = this.match
  //   match.turnPlayerIndex = -1
  //   this.progressTurn()
  // }

  // /**
  //  * Progress within turn (next player)
  //  */
  // progressTurn () {
  //   const match = this.match
  //   ++match.turnPlayerIndex
  //   if (match.turnPlayer) {
  //     // match.turnPlayer.bot.object3d.position.z += 1
  //     match.turnPlayer.bot.cardStart()
  //   }
  // }

  cardAllDone (bot) {
    this.progressTurn()
  }

  preAnimateFunc () {
    this.explosionMaterial.uniforms[ 'time' ].value = this.clock.getElapsedTime()
  }

  createExplosionObj (size = 1) {
    const obj = new THREE.Mesh(
      this.explosionGeometry,
      this.explosionMaterial
    )
    obj.scale.setScalar(0.025 * size)
    obj.bloom = true
    return obj
  }

  createExplosion (funcMax, size = 1, duration = 750) {
    const sizeCur = { size: 0.01 }
    const obj = this.createExplosionObj(sizeCur.size)
    new TWEEN.Tween(sizeCur).to({ size }, duration)
      .onUpdate(() => {
        obj.scale.setScalar(0.025 * sizeCur.size)
      })
      .yoyo(true)
      .repeat(1)
      .easing(TWEEN.Easing.Quartic.InOut)
      .onComplete(() => {
        if (obj.parent) obj.parent.remove(obj)
      })
      .onRepeat(funcMax)
      .start()
    this.scene.add(obj)
    return obj
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
