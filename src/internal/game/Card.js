import { glos } from '../Glos'

export class Card {
  constructor (cardType) {
    this.cardType = cardType
  }

  invoke (bot) {
    this.cardType.func(bot)
  }

  removeFromHand () {
    const index = glos.hand.indexOf(this)
    if (index >= 0) glos.hand.splice(index, 1)
  }
}
