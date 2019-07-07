import { assignNewVueObserver } from '../Dereactivate'
import { Bot } from './Bot'

export class Player {
  constructor (game, uid, name) {
    this.name = name
    this.alive = true
    this.killedInTurn = -1
    this.killedBy = []
    this.icon = 'robot'
    assignNewVueObserver(this)

    this.game = game
    this.uid = uid
    this.hand = [] // Cards
    this.bot = new Bot(game, this)
    this.tieBreaker = 0
  }

  markAsDead (killer) {
    if (!this.killedBy.includes(killer)) this.killedBy.push(killer)
    if (this.alive) {
      this.alive = false
      const playerIconsDead = ['ghost', 'grave-stone', 'halloween', 'nuke', 'fire', 'skull', 'skull-crossbones', 'skull-outline', 'skull-crossbones-outline', 'bone', 'emoticon-dead', 'emoticon-dead-outline', 'trash-can', 'trash-can-outline', 'sleep']
      this.icon = playerIconsDead[Math.round(playerIconsDead.length * this.game.match.rngCosmetic.nextNumber())]

      const match = this.game.match
      this.killedInTurn = match.turn
      const index = match.turnPlayers.indexOf(this)
      if (index >= 0) match.turnPlayers.splice(index, 1)
      match.deadPlayers.push(this)
      return true
    } else {
      return false
    }
  }
}
