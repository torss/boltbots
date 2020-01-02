import { assignNewVueObserver } from '../Dereactivate'
import { Bot } from './Bot'
import { Card } from './Card'
import { cryptoAlgoKeySv } from './Crypto'

export class Player {
  constructor (game, id, name) {
    this.id = id
    this.name = name
    this.alive = true
    this.killedInTurn = -1
    this.killedBy = []
    this.icon = 'robot'
    this.completedCheckpoints = 0
    this.netKey = ''
    this.pnid = ''
    // this.peerInfo = undefined
    this.left = false
    this.endTurn = false
    this.completeTurn = false
    this.lastPingTimeout = false
    assignNewVueObserver(this)

    this.game = game
    this.hand = [] // Cards
    this.bot = new Bot(game, this)
    this.lastPing = Date.now()
    this.hostVote = undefined
    // this.tieBreaker = 0
    this.cryptoKeySvPublicEx = undefined
    this.cryptoKeySvPublic = undefined
  }

  async cryptoKeySvPublicLoad (cryptoKeySvPublicEx) {
    this.cryptoKeySvPublicEx = cryptoKeySvPublicEx
    this.cryptoKeySvPublic = await crypto.subtle.importKey('jwk', cryptoKeySvPublicEx, cryptoAlgoKeySv, false, ['verify'])
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

  win (victoryType) {
    const match = this.game.match
    match.gameOver = victoryType
    match.victors.push(this)
  }

  destroy () {
    this.bot.destroy()
  }

  serialize (playing = false) {
    const { id, name, netKey, pnid, hand, bot, killedInTurn, killedBy, completedCheckpoints, lastPing, cryptoKeySvPublicEx, left } = this
    let result = { id, name, netKey, pnid, cryptoKeySvPublicEx, left }
    if (playing) {
      result.hand = hand.map(card => card.serialize())
      result.bot = bot.serialize()
      result.killedBy = killedBy.map(player => player.id)
      result = { ...result, killedInTurn, completedCheckpoints, lastPing }
    }
    return result
  }

  deserialize (playerData) {
    const { id, name, netKey, pnid, left, hand, bot, killedInTurn, completedCheckpoints, lastPing, cryptoKeySvPublicEx } = playerData
    if (id !== undefined) this.id = id
    if (name !== undefined) this.name = name
    if (netKey !== undefined) this.netKey = netKey
    if (pnid !== undefined) this.pnid = pnid
    if (left !== undefined) this.left = left
    if (hand !== undefined) this.hand = hand.map(cardData => new Card(cardData).deserialize(cardData))
    if (bot !== undefined) this.bot.deserialize(bot)
    if (killedInTurn !== undefined) {
      this.killedInTurn = killedInTurn
      this.alive = killedInTurn < 1
      // killedBy must be deserialized by Match
    }
    if (completedCheckpoints !== undefined) this.completedCheckpoints = completedCheckpoints
    if (lastPing !== undefined) this.lastPing = lastPing
    if (cryptoKeySvPublicEx !== undefined) this.cryptoKeySvPublicLoad(cryptoKeySvPublicEx)
  }
}
