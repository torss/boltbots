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
}
