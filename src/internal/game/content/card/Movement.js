import * as TWEEN from '@tweenjs/tween.js'
import { CardType } from '../../CardType'

export const cardTypeList = []

for (let i = 1; i <= 3; ++i) {
  cardTypeList.push(new CardType('forward-' + i, 'Forward x' + i, (game) => {
    const match = game.match
    const bot = match.turnPlayer.bot
    const object3d = bot.object3d

    // for (let step = 0; step < i; ++step) bot.object3d.position.add(bot.direction)
    const tween = new TWEEN.Tween(object3d.position).to(object3d.position.clone().addScaledVector(bot.direction, i), 1000 + i * 100)
    // tween.easing(TWEEN.Easing.Back.InOut)
    tween.easing(tweenEasingStraight)
    tween.start()
  }))
}

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
  cardTypeList.push(new CardType('rotate-' + what, 'Rotate ' + what, (game) => {
    const match = game.match
    const bot = match.turnPlayer.bot
    bot.rotate(value)
  }))
}

cardTypeList.push(new CardType('u-turn', 'U-Turn', (game) => {
  const match = game.match
  const bot = match.turnPlayer.bot
  bot.rotate(Math.random() > 0.5 ? 2 : -2)
}))
