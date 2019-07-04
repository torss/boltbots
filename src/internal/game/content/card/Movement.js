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
    tween.easing(tweenEasing)
    tween.start()
  }))
}

// Based on TWEEN.Easing.Back.InOut https://github.com/tweenjs/tween.js/blob/master/src/Tween.js#L741
function tweenEasing (k) {
  const s = 1.70158 * 1.525

  if ((k *= 2) < 1) return 0.5 * (k * k * ((s + 1) * k - s))

  return -0.5 * ((k -= 2) * k * k * k - 2) // Quartic
  // return 0.5 * ((k -= 2) * k * k + 2) // Cubic
  // return -0.5 * (--k * (k - 2) - 1) // Quadratic
  // return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2) // Back
}
