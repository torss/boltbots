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
    this.alive = true
    this.health = 1
    this.towerDistance = -1
    assignNewVueObserver(this)

    this.game = game
    this.player = player
    this.cardSlots = []
    this.cardIndex = 0
    this.tiEns = [] // Occupied tiles
    this.guiColor = new THREE.Color(1, 1, 1)
    this.lazorOrb = undefined
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

  invokeCardSlot (index) {
    this.cardIndex = index
    const cardSlot = this.cardSlots[index]
    if (!cardSlot || !cardSlot.invoke(this)) return false
    return true
  }

  cardDone () {
    const cardSlot = this.cardSlots[this.cardIndex]
    if (cardSlot) cardSlot.active = false
    this.game.match.progressTurn()
  }

  // cardAllDone () {
  //   this.cardIndex = -1
  //   this.game.cardAllDone(this)
  // }

  // cardDone () {
  //   const cardSlot = this.cardSlots[this.cardIndex]
  //   if (!cardSlot) {
  //     console.warn('Broken cardDone call, cardIndex:', this.cardIndex)
  //     return
  //   }
  //   cardSlot.active = false
  //   this.cardNext()
  // }

  // cardNext () {
  //   ++this.cardIndex
  //   const cardSlot = this.cardSlots[this.cardIndex]
  //   if (!cardSlot || !cardSlot.invoke(this)) this.cardAllDone()
  // }

  // cardStart () {
  //   this.cardIndex = -1
  //   this.cardNext()
  // }

  enterOnMap () {
    const { map, controlTower } = this.game.match
    const position = this.object3d.position
    map.enterBot(position, this)
    this.towerDistance = controlTower.position.distanceTo(position.clone().floor().addScalar(0.5))
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

  shoot () {
    const match = this.game.match
    const map = match.map
    const position = this.object3d.position
    const scanPos = position.clone().floor()
    while (true) {
      scanPos.add(this.direction)
      const tiEn = map.getTiEnAt(scanPos)
      if (!tiEn || tiEn.tiTy.wall) {
        match.actionDone()
        return
      }
      if (tiEn.entity) {
        const lazorOrb = this.lazorOrb
        const shotPos = lazorOrb.position
        const origPos = lazorOrb.position.clone()
        const shotPosWorld = lazorOrb.getWorldPosition(new THREE.Vector3())
        this.game.scene.add(lazorOrb)
        shotPos.copy(shotPosWorld)
        const target = tiEn.entity
        const targetPos = target.object3d.position.clone().floor()
        // TODO SFX: Lazor
        new TWEEN.Tween(shotPos)
          .to(targetPos, shotPos.distanceTo(targetPos) * 125)
          .onComplete(() => {
            target.damage(match.damageLazor, this.player)
            this.object3d.add(lazorOrb)
            shotPos.copy(origPos)
            match.actionDone()
          })
          .start()
        return
      }
    }
  }

  damage (amount, attacker) {
    this.health -= amount
    if (this.health < Number.EPSILON) return this.explode(attacker)
    return false
  }

  explode (killer) {
    if (!this.player.markAsDead(killer)) return false
    const { map } = this.game.match
    this.alive = false
    this.health = 0
    this.object3d.visible = false
    const position = this.object3d.position
    map.getTiEnAt(position).entity = undefined
    this.towerDistance = -1
    this.clearCardSlots()
    // TODO explosions!
    return true
  }

  clearCardSlots () {
    for (const cardSlot of this.cardSlots) cardSlot.clear()
  }
}

// Based on TWEEN.Easing.Back.InOut https://github.com/tweenjs/tween.js/blob/master/src/Tween.js#L741
function tweenEasingRotate (k) {
  const customFactor = 0.5
  const s = 1.70158 * 1.525 * customFactor
  if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s))
  return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2)
}
