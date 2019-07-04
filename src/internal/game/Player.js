import { Bot } from './Bot'

export class Player {
  constructor (uid) {
    this.uid = uid
    this.cardSlots = []
    this.bot = new Bot()
  }
}
