import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { assignNewVueObserver } from '../Dereactivate'

const directionKeyString = 'NESW'

const directions = {
  N: new THREE.Vector3(+1, 0, 0),
  S: new THREE.Vector3(-1, 0, 0),
  E: new THREE.Vector3(0, 0, +1),
  W: new THREE.Vector3(0, 0, -1)
}

const directionsAngle = {
  N: 0.5 * Math.PI,
  S: 1.5 * Math.PI,
  E: 0.0 * Math.PI,
  W: 1.0 * Math.PI
}

/**
 * A bot on the board.
 * (Currently each player has only one bot.)
 */
export class Bot {
  constructor (game, player) {
    assignNewVueObserver(this)
    this.game = game
    this.player = player
    this.cardSlots = []
    this.cardIndex = 0
    this.tiEns = [] // Occupied tiles
    this._object3d = undefined
    this._directionKey = 'N'
  }

  get object3d () {
    return this._object3d
  }

  set object3d (value) {
    this._object3d = value
    this.applyDirectionKeyToObject3d()
  }

  get directionKey () {
    return this._directionKey
  }

  set directionKey (value) {
    this._directionKey = value
    this.applyDirectionKeyToObject3d()
  }

  applyDirectionKeyToObject3d () {
    const object3d = this.object3d
    if (object3d) object3d.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), directionsAngle[this.directionKey])
  }

  get direction () {
    return directions[this.directionKey]
  }

  rotate (indexChange, animated = true) {
    const index = directionKeyString.indexOf(this.directionKey)
    let indexNext = (index + indexChange) % directionKeyString.length
    if (indexNext < 0) indexNext += directionKeyString.length
    if (animated) {
      const angleNow = { angle: directionsAngle[this.directionKey] }
      this._directionKey = directionKeyString[indexNext]
      const angleTarget = { angle: angleNow.angle - indexChange * 0.5 * Math.PI } // { angle: directionsAngle[this.directionKey] }
      new TWEEN.Tween(angleNow)
        .to(angleTarget, 1000)
        .easing(tweenEasingRotate)
        .onUpdate(() => {
          this.object3d.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), angleNow.angle)
        })
        .onComplete(() => this.cardDone())
        .start()
    } else {
      this.directionKey = directionKeyString[indexNext]
    }
  }

  cardAllDone () {
    this.cardIndex = -1
    this.game.cardAllDone(this)
  }

  cardDone () {
    const cardSlot = this.cardSlots[this.cardIndex]
    if (!cardSlot) {
      console.warn('Broken cardDone call, cardIndex:', this.cardIndex)
      return
    }
    cardSlot.active = false
    this.cardNext()
  }

  cardNext () {
    ++this.cardIndex
    const cardSlot = this.cardSlots[this.cardIndex]
    if (!cardSlot || !cardSlot.invoke(this)) this.cardAllDone()
  }

  cardStart () {
    this.cardIndex = -1
    this.cardNext()
  }

  enterOnMap () {
    const map = this.game.match.map
    map.enterBot(this.object3d.position, this)
  }

  cleanupVisitedTiles () {
    this.tiEns = this.tiEns.filter((tiEn) => {
      const visited = tiEn.visited
      tiEn.visited = false
      if (visited) {
        return true
      } else {
        tiEn.entity = undefined
        return false
      }
    })
  }
}

// Based on TWEEN.Easing.Back.InOut https://github.com/tweenjs/tween.js/blob/master/src/Tween.js#L741
function tweenEasingRotate (k) {
  const customFactor = 0.5
  const s = 1.70158 * 1.525 * customFactor
  if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s))
  return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2)
}
