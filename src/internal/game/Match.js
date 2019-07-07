import Random from 'rng.js'
import { assignNewVueObserver } from '../Dereactivate'
import { ControlTower } from './ControlTower'
import { Card } from './Card'
import { cardTypeList } from './content'

export class Match {
  constructor () {
    this.players = []
    this.turnPlayers = [] // These players must be alive
    this.deadPlayers = []
    this.playerSelf = undefined
    this.turn = 1
    this.turnInProgress = false
    this.handSize = 8
    this.damageLazor = 0.20
    this.damageShove = 0.05
    this.damageCrush = 0.15
    assignNewVueObserver(this)

    this.map = undefined
    // this.playerSelfUid = -1
    this.turnCardIndex = 0
    this.turnPlayerIndex = 0
    this.remainingActionCount = 0
    this.controlTower = new ControlTower()
    this.rng = new Random(0, 0) // Primary rng
    this.rngMapGen = new Random(0, 0) // MapGen rng
    this.rngCosmetic = new Random(0, 0) // Unimportant rng
  }

  get turnPlayer () {
    return this.turnPlayers[this.turnPlayerIndex]
  }

  startTurn () {
    this.turnInProgress = true
    this.turnPlayers = this.players.filter(player => player.alive)
    this.turnCardIndex = 0
    this.turnPlayerIndex = -1
    this.prepareTurnPlayers()
    this.progressTurn()
  }

  completeTurn () {
    for (const player of this.turnPlayers) {
      // Clear used cards
      player.bot.clearCardSlots()
      // Refill hands
      for (let i = player.hand.length; i < this.handSize; ++i) {
        const cardType = cardTypeList[Math.floor(this.rng.nextNumber() * cardTypeList.length)]
        player.hand.push(new Card(cardType))
      }
    }
    ++this.turn
    this.turnInProgress = false
  }

  prepareTurnPlayers () {
    for (const player of this.turnPlayers) player.tieBreaker = this.rng.nextNumber()
    this.turnPlayers.sort((a, b) => (a.bot.towerDistance === b.bot.towerDistance) ? a.tieBreaker - b.tieBreaker : a.bot.towerDistance - b.bot.towerDistance)
  }

  actionDone () {
    --this.remainingActionCount
    if (this.remainingActionCount <= 0) {
      this.progressTurnNextCardSlot()
    }
  }

  progressTurnNextCardSlot () {
    ++this.turnCardIndex
    this.turnPlayerIndex = -1
    this.prepareTurnPlayers()
    this.progressTurn()
  }

  progressTurn () {
    if (this.turnPlayers.length === 0) {
      this.completeTurn()
      return // No players
    }
    while (true) {
      ++this.turnPlayerIndex
      if (this.turnPlayer) {
        let moreSlotsExist = false
        while (this.turnPlayer) {
          const bot = this.turnPlayer.bot
          if (bot.invokeCardSlot(this.turnCardIndex)) return // Next card invoked
          if (this.turnCardIndex < bot.cardSlots.length - 1) moreSlotsExist = true
          ++this.turnPlayerIndex
        }
        if (moreSlotsExist) {
          // Skipped a slot (no one had any cards in a slot at the current index)
          continue
        } else {
          // Turn complete
          this.completeTurn()
          return
        }
      } else {
        if (this.turnPlayers.length > 0) {
          // Fire lazors!
          this.remainingActionCount += this.turnPlayers.length
          for (const player of this.turnPlayers) player.bot.shoot()
          return
        } else this.progressTurnNextCardSlot()
      }
    }
  }
}
