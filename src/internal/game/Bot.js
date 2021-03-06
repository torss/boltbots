import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import '../extensions/three'
import { assignNewVueObserver } from '../Dereactivate'
import { straightMove } from './content/card/Movement'
import { CardSlot } from './CardSlot'

const directionKeyString = 'NESW'

export const directions = {
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

export const directionsAxis = {
  N: 'x',
  S: 'x',
  E: 'z',
  W: 'z'
}

const rotationToDirection = {
  'X+': 'N',
  'X-': 'S',
  'Z+': 'E',
  'Z-': 'W'
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
    // this.cardSlotsNext = []
    this.cardIndex = 0
    this.tiEns = [] // Occupied tiles
    this.guiColor = new THREE.Color(1, 1, 1)
    this.engineSound = undefined
    this.engineSoundGen = undefined
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

  get directionAxis () {
    return directionsAxis[this.directionKey]
  }

  get directionKey () {
    return this._directionKey
  }

  set directionKey (value) {
    this._directionKey = value
    this.applyDirectionKeyToObject3d()
  }

  applyDirectionKeyToObject3d () {
    const { object3d } = this
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
      this.engineSound.setVolume(1)
      const angleNow = { angle: directionsAngle[this.directionKey] }
      this._directionKey = directionKeyString[indexNext]
      const angleTarget = { angle: angleNow.angle - indexChange * 0.5 * Math.PI } // { angle: directionsAngle[this.directionKey] }
      new TWEEN.Tween(angleNow)
        .to(angleTarget, 1000)
        .easing(tweenEasingRotate)
        .onUpdate(() => {
          this.object3d.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), angleNow.angle)
        })
        .onComplete(() => {
          this.engineSound.setVolume(0.01)
          this.cardDone()
        })
        .start()
    } else {
      this.directionKey = directionKeyString[indexNext]
    }
  }

  resizeCardSlots (slotCount) {
    const { cardSlots } = this
    cardSlots.splice(slotCount, cardSlots.length - slotCount)
    for (let i = cardSlots.length; i < slotCount; ++i) cardSlots.push(new CardSlot())
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

  enterOnMap (rest = false) {
    const { match, sfxf } = this.game
    const { map, controlTower } = match
    const position = this.object3d.position
    map.enterBot(position, this)
    this.towerDistance = controlTower.position.distanceTo(position.clone().floor().addScalar(0.5))
    if (rest) {
      // Check checkpoint
      const next = this.player.completedCheckpoints
      if (match.checkpoints[next].checkPosition.equals(position.clone().floor())) {
        ++this.player.completedCheckpoints
        this.health += 2 * match.damageLazor
        if (this.health > 1) this.health = 1
        this.object3d.add(sfxf.cpasCheckpoint())
        if (this.player.completedCheckpoints === match.checkpointCount) {
          this.player.win('checkpoint')
        }
      }
    }
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

  conveyor () {
    const game = this.game
    const match = game.match
    const map = match.map
    const position = this.object3d.position
    const tiEn = map.getTiEnAt(position)
    const tiTy = tiEn.tiTy
    const moveFactors = {
      'ConveyorSingle0': 1,
      'ConveyorDouble0': 2
    }
    const moveFactor = typeof moveFactors[tiTy.key] === 'number' ? moveFactors[tiTy.key] : 0
    if (moveFactor > 0) {
      this.hoverEffect(true)
      const moveDirectionKey = rotationToDirection[tiEn.rotation]
      straightMove(this, moveFactor, moveDirectionKey, () => match.actionDone())
    } else {
      match.actionDone()
    }
  }

  hoverEffect (activate = false) {
    const game = this.game
    const tracks = this.object3d.children[0].children[1].children[0]
    if (tracks.name !== 'Tracks') {
      console.warn('Bot conveyor glow - "Tracks" are not at the expected place')
      return
    }
    const isActive = !!tracks.hovering
    if (activate === isActive) return
    if (activate) {
      tracks.bloom = true
      tracks.hovering = tracks.material
      tracks.material = game.materials['Hover']
    } else {
      tracks.bloom = false
      tracks.material = tracks.hovering
      tracks.hovering = undefined
    }
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

        lazorOrb.add(this.game.sfxf.cpasShoot())

        new TWEEN.Tween(shotPos)
          .to(targetPos, shotPos.distanceTo(targetPos) * 125)
          .onComplete(() => {
            target.damage('lazor', this.player)
            this.object3d.add(lazorOrb)
            shotPos.copy(origPos)
            match.actionDone()
          })
          .start()
        return
      }
    }
  }

  damageFlash (duration = 100) {
    const { object3d } = this
    object3d.traverseVisible(obj => {
      if (obj.isMesh && !obj.bloom) obj.bloom = 'tmp'
    })
    new TWEEN.Tween({}).to({}, duration).onComplete(() => {
      object3d.traverseVisible(obj => {
        if (obj.bloom === 'tmp') obj.bloom = false
      })
    }).start()
  }

  highlight () {
    this.damageFlash(2000)
  }

  damage (type, attacker) {
    if (!this.alive) {
      this.player.markAsDead(attacker) // Add multiple killers
      return
    }
    const { game, object3d } = this
    const { match, sfxf } = game
    let amount = 0
    switch (type) {
      case 'lazor':
        amount = match.damageLazor
        object3d.add(sfxf.cpasHit())
        this.damageFlash()
        break
      case 'shove':
        amount = match.damageShove
        object3d.add(sfxf.cpasShove())
        break
      case 'crush':
        amount = match.damageCrush
        object3d.add(sfxf.cpasCrush())
        break
    }
    this.health -= amount
    if (this.health < Number.EPSILON) return this.explode(attacker)
    return false
  }

  explode (killer) {
    if (!this.player.markAsDead(killer)) return false
    this.alive = false
    this.health = 0
    const sfx = this.game.sfxf.cpasExplode()
    sfx.position.copy(this.object3d.position)
    this.game.scene.add(sfx)
    this.game.createExplosion().position.copy(this.object3d.position)
    this.destroy()
    return true
  }

  clearCardSlots () {
    for (const cardSlot of this.cardSlots) cardSlot.clear()
  }

  clearTiEns () {
    for (const tiEn of this.tiEns) tiEn.entity = undefined
    this.tiEns = []
  }

  destroy (removeSelf = true) {
    this.clearTiEns()
    this.towerDistance = -1
    this.clearCardSlots()
    this.engineSoundGen.stop()
    if (removeSelf) this.object3d.removeSelf()
  }

  serialize () {
    return {
      health: this.health,
      position: this.object3d && this.object3d.position.serialize(),
      directionKey: this.directionKey,
      cardSlots: this.cardSlots.map(cardSlot => cardSlot.serialize())
    }
  }

  deserialize (botData) {
    const { health, position, directionKey, cardSlots } = botData
    if (health !== undefined) {
      const healthOld = this.health
      this.health = health
      if (healthOld >= Number.EPSILON && this.health < Number.EPSILON) {
        this.alive = false
        this.destroy()
      } // TODO resurrect?
    }
    if (position !== undefined && this.object3d) this.object3d.position.copy(position)
    if (directionKey !== undefined) this.directionKey = directionKey
    if (cardSlots !== undefined) this.cardSlots = cardSlots.map(data => new CardSlot().deserialize(data))
  }
}

// Based on TWEEN.Easing.Back.InOut https://github.com/tweenjs/tween.js/blob/master/src/Tween.js#L741
function tweenEasingRotate (k) {
  const customFactor = 0.5
  const s = 1.70158 * 1.525 * customFactor
  if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s))
  return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2)
}
