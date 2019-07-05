import { Bot } from './Bot'

export class Player {
  constructor (game, uid) {
    this.game = game
    this.hand = [] // Cards
    this.uid = uid
    this.bot = new Bot()
  }
}
