import { Card } from './Card'

export class CardSlot {
  constructor () {
    this.card = undefined
    this.active = false
  }

  invoke (bot) {
    if (this.card) {
      this.active = true
      this.card.invoke(bot)
      return true
    }
    return false
  }

  clear () {
    this.card = undefined
    this.active = false
  }

  serialize () {
    return { card: this.card && this.card.serialize() }
  }

  deserialize (data) {
    if (data.card) this.card = new Card().deserialize(data.card)
    else this.card = undefined
    return this
  }
}
