import { glos } from '../Glos'
import { cardTypes } from './content'

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

  serialize () {
    return { cardType: this.cardType.key }
  }

  deserialize (data) {
    this.cardType = cardTypes[data.cardType]
    return this
  }
}
