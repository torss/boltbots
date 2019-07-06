import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { CardType } from '../../CardType'
import { Bot } from '../../Bot'

export const cardTypeList = []

function straightMove (bot, factor) {
  const duration = 1000 + Math.abs(factor) * 100
  const factorSign = factor > 0 ? 1 : -1
  const object3d = bot.object3d

  // for (let step = 0; step < i; ++step) bot.object3d.position.add(bot.direction)
  const prevPos = object3d.position.clone()
  const shoving = []
  const finishMove = () => {
    bot.enterOnMap()
    const map = bot.game.match.map // DEBUGONLY
    console.log('bot', bot.object3d.position, map.getTiEnAt(bot.object3d.position).entity === bot) // DEBUGONLY
    window.bot = bot // DEBUGONLY
    window.shoving = shoving // DEBUGONLY
    bot.cardDone()
  }
  const finishShoving = (crush = false) => {
    if (shoving.length > 0) {
      if (crush) shoving.unshift(bot)
      const frontEntity = shoving[shoving.length - 1]
      const frontPos = frontEntity.object3d.position.clone().floor()
      for (let i = 0; i < shoving.length; ++i) {
        const k = shoving.length - 1 - i
        const j = crush ? i : k
        const last = i === shoving.length - 1
        const entity = shoving[j]
        const posTile = crush ? frontPos.clone().addScaledVector(bot.direction, factorSign > 0 ? -k - 1 : k) : bot.object3d.position.clone().floor().addScaledVector(bot.direction, factorSign * (j + 1))
        new TWEEN.Tween(entity.object3d.position).to(posTile, 1100)
          .delay(i * 250)
          .easing(TWEEN.Easing.Quartic.InOut)
          .onComplete(() => {
            entity.enterOnMap()
            entity.cleanupVisitedTiles()
            const map = bot.game.match.map // DEBUGONLY
            console.log('shove-' + i, entity.object3d.position, map.getTiEnAt(entity.object3d.position).entity === entity) // DEBUGONLY
            if (last) finishMove()
          })
          .start()
      }
    } else {
      finishMove()
    }
  }
  const finish = finishShoving
  const targetPos = object3d.position.clone().addScaledVector(bot.direction, factor)
  const originalTilePos = object3d.position.clone().floor()
  // const originalMoveDistance = object3d.position.distanceTo(targetPos)
  let tween = new TWEEN.Tween(object3d.position).to(targetPos, duration)
  // tween.easing(TWEEN.Easing.Back.InOut)
  let mustCrush = false
  // let mustCrushEntity = false
  let canShove = true
  const update = () => {
    const distFactor = 0.325
    const map = bot.game.match.map

    // Next
    // console.log('canShove', canShove) // DEBUGONLY
    const frontEntity = shoving[shoving.length - 1] || bot
    let pos = frontEntity.object3d.position.clone().addScalar(0.5).addScaledVector(bot.direction, factorSign * distFactor)
    // const posTile = object3d.position.clone().floor().addScaledVector(bot.direction, shoving.length + 1) // DEBUGONLY
    if (shoving.length > 0 && !mustCrush) {
      const posTile = bot.object3d.position.clone().floor()
      const traveledDistance = originalTilePos.distanceTo(posTile)
      const remainingDistance = (factor > 0 ? factor + 1 : -factor) - traveledDistance
      const shovable = remainingDistance > shoving.length
      const posTileCrush = pos.clone().floor() // posTile.clone().addScaledVector(bot.direction, factorSign * shoving.length)
      const obstacleCrush = map.checkObstacle(posTileCrush, frontEntity)
      // console.log('posTileCrush', originalTilePos.z, posTileCrush.z, !!obstacleCrush, traveledDistance, shovable) // DEBUGONLY
      console.log('shovable', shovable, 'remainingDistance', remainingDistance, 'shoving.length', shoving.length) // DEBUGONLY
      if (shovable ? obstacleCrush === 'wall' : obstacleCrush) {
        // if (obstacleCrush instanceof Bot) mustCrushEntity = true
        canShove = false
        console.log('MUST CRUSH', obstacleCrush instanceof Bot) // DEBUGONLY
        mustCrush = true
        // tween._duration *= 1 + bot.object3d.position.distanceTo(posTileCrush) / originalMoveDistance
        // targetPos.copy(posTileCrush)
        tween.stop()
        tween = new TWEEN.Tween(bot.object3d.position)
          .to(posTileCrush, 250 * bot.object3d.position.distanceTo(posTileCrush))
          .onUpdate(update)
          .onComplete(() => console.warn('mustCrush move finished irregularly'))
          .start()
        return
      }
    }
    const obstacle = map.checkObstacle(pos, frontEntity)
    let collide = true
    window.THREE = THREE // DEBUGONLY
    const tiEn = map.getTiEnAt(pos) // DEBUGONLY
    window.tiEn = tiEn // DEBUGONLY
    // console.log(obstacle, tiEn && tiEn.entity === bot, tiEn.tiTy.wall, tiEn && tiEn.tiTy.key) // console.log(pos, obstacle, tiEn && tiEn.tiTy.key, tiEn.tiTy.wall) // DEBUGONLY
    if (obstacle) {
      if (obstacle instanceof Bot) {
        const distance = pos.distanceTo(obstacle.object3d.position.clone().addScalar(0.5))
        if (distance > 0.5 * distFactor) collide = false
      } else {
        canShove = false
      }
    }
    if (obstacle) {
      if (collide) {
        console.log('COLLIDE') // DEBUGONLY
        if (canShove) {
          if (frontEntity !== obstacle) shoving.push(obstacle)
        } else {
          if (shoving.length > 0) console.log('CRUSH') // DEBUGONLY
          tween.stop()
          new TWEEN.Tween(bot.object3d.position).to(bot.object3d.position.clone().floor().addScaledVector(bot.direction, -factorSign), 500)
            .easing(TWEEN.Easing.Back.Out)
            .onComplete(() => finish(true))
            .start()
        }
      }
    } else {
      // map.enterBot(pos, bot)
    }

    // Current
    bot.enterOnMap()

    // Cleanup
    bot.cleanupVisitedTiles()

    if (shoving.length > 0) {
      const deltaPos = bot.object3d.position.clone().sub(prevPos)
      for (const entity of shoving) {
        entity.object3d.position.add(deltaPos)
        entity.enterOnMap()
        entity.cleanupVisitedTiles()
      }
    }
    prevPos.copy(bot.object3d.position)
  }
  tween
    .easing(tweenEasingStraight)
    .onUpdate(update)
    .onComplete(() => finish(false))
    .start()
}

function createStraightMoveFunc (factor) {
  return (bot) => straightMove(bot, factor)
}

for (let i = 1; i <= 3; ++i) cardTypeList.push(new CardType('forward-' + i, 'Forward x' + i, createStraightMoveFunc(i)))
for (let i = 1; i <= 2; ++i) cardTypeList.push(new CardType('backward-' + i, 'Backward x' + i, createStraightMoveFunc(-i)))

// Based on TWEEN.Easing.Back.InOut https://github.com/tweenjs/tween.js/blob/master/src/Tween.js#L741
function tweenEasingStraight (k) {
  const s = 1.70158 * 1.525

  if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s))

  return -0.5 * ((k -= 2) * k * k * k - 2) // Quartic
  // return 0.5 * ((k -= 2) * k * k + 2) // Cubic
  // return -0.5 * (--k * (k - 2) - 1) // Quadratic
  // return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2) // Back
}

for (const { what, value } of [{ what: 'right', value: +1 }, { what: 'left', value: -1 }]) {
  cardTypeList.push(new CardType('rotate-' + what, 'Rotate ' + what, (bot) => {
    bot.rotate(value)
  }))
}

cardTypeList.push(new CardType('u-turn', 'U-Turn', (bot) => {
  bot.rotate(Math.random() > 0.5 ? 2 : -2)
}))
