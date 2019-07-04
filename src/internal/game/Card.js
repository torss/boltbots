export class Card {
  constructor (cardType) {
    this.cardType = cardType
  }

  invoke (game) {
    this.cardType.func(game)
  }
}
