import Random from 'rng.js'
import { ControlTower } from './ControlTower'

export class Match {
  constructor () {
    this.map = undefined
    this.players = []
    this.turnPlayers = []
    // this.playerSelfUid = -1
    this.playerSelf = undefined
    this.turn = 0
    this.turnInProgress = false
    this.turnCardIndex = 0
    this.turnPlayerIndex = 0
    this.controlTower = new ControlTower()
    this.rng = new Random(0, 0) // Primary rng
  }

  get turnPlayer () {
    return this.turnPlayers[this.turnPlayerIndex]
  }

  startTurn () {
    this.turnInProgress = true
    this.turnPlayers = [...this.players]
    this.turnCardIndex = 0
    this.turnPlayerIndex = -1
    this.prepareTurnPlayers()
    this.progressTurn()
  }

  completeTurn () {
    this.turnInProgress = false
  }

  prepareTurnPlayers () {
    for (const player of this.turnPlayers) player.tieBreaker = this.rng.nextNumber()
    this.turnPlayers.sort((a, b) => (a.bot.towerDistance === b.bot.towerDistance) ? a.tieBreaker - b.tieBreaker : a.bot.towerDistance - b.bot.towerDistance)
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
        // Next card slot
        ++this.turnCardIndex
        this.turnPlayerIndex = -1
        this.prepareTurnPlayers()
      }
    }
  }
}
