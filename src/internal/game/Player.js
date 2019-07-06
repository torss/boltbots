import { assignNewVueObserver } from '../Dereactivate'
import { Bot } from './Bot'

export class Player {
  constructor (game, uid, name) {
    this.name = name
    assignNewVueObserver(this)

    this.game = game
    this.uid = uid
    this.hand = [] // Cards
    this.bot = new Bot(game, this)
  }
}
