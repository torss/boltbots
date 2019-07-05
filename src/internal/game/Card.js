export class Card {
  constructor (cardType) {
    this.cardType = cardType
  }

  invoke (bot) {
    this.cardType.func(bot)
  }
}
