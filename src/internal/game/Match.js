import { assignNewVueObserver } from '../Dereactivate'
import { ControlTower } from './ControlTower'
import { Card } from './Card'
import { cardTypeList } from './content'
import { Rng } from '../Rng'

export class Match {
  constructor () {
    this.players = []
    this.turnPlayers = [] // These players must be alive
    this.deadPlayers = []
    this.playerSelf = undefined
    this.turn = 1
    this.turnInProgress = false
    this.gameOver = false
    this.gameOverQuip = 0
    this.victors = []
    this.handSize = 8
    this.damageLazor = 0.20
    this.damageShove = 0.05
    this.damageCrush = 0.15
    this.turnCardIndex = -1
    assignNewVueObserver(this)

    this.map = undefined
    this.checkpointCount = 3
    // this.playerSelfUid = -1
    this.turnPlayerIndex = 0
    this.remainingActionCount = 0
    this.controlTower = new ControlTower()
    this.checkpoints = []
    this.actionType = 'lazor'
    this.rng = new Rng(0, 0) // Primary rng
    this.rngMapGen = new Rng(0, 0) // MapGen rng
    this.rngCosmetic = new Rng(0, 0) // Unimportant rng
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
    this.turnInProgress = false
    this.turnCardIndex = -1
    this.turnPlayerIndex = -1
    if (this.turnPlayers.length === 0) this.gameOver = 'draw'
    else if (this.turnPlayers.length === 1) {
      this.gameOver = 'lms'
      this.victors = [this.turnPlayers[0]]
    }
    if (!this.gameOver) ++this.turn
    if (this.gameOver) {
      this.gameOverQuip = this.rngCosmetic.nextNumber()
    }
  }

  prepareTurnPlayers () {
    for (const player of this.turnPlayers) player.tieBreaker = this.rng.nextNumber()
    this.turnPlayers.sort((a, b) => (a.bot.towerDistance === b.bot.towerDistance) ? a.tieBreaker - b.tieBreaker : a.bot.towerDistance - b.bot.towerDistance)
  }

  actionDone () {
    --this.remainingActionCount
    if (this.remainingActionCount === 0) {
      switch (this.actionType) {
        case 'lazor':
          // Run conveyor belts
          this.actionType = 'conveyor'
          this.turnPlayerIndex = -1
          this.remainingActionCount = 1
          this.actionDone()
          break
        case 'conveyor':
          ++this.turnPlayerIndex
          this.remainingActionCount = 1
          if (this.turnPlayer) this.turnPlayer.bot.conveyor()
          else this.progressTurnNextCardSlot()
          break
        default:
          console.error('Match::actionDone - Unknown actionType:', this.actionType)
          this.progressTurnNextCardSlot()
          break
      }
    }
  }

  progressTurnNextCardSlot () {
    ++this.turnCardIndex
    this.turnPlayerIndex = -1
    this.prepareTurnPlayers()
    this.progressTurn()
  }

  progressTurn () {
    if (this.turnPlayers.length === 0 || this.gameOver) {
      this.completeTurn()
      return // No players or other game over kind (checkpoint victory)
    }
    while (true) {
      ++this.turnPlayerIndex
      if (this.turnPlayer) {
        let moreSlotsExist = false
        while (this.turnPlayer) {
          const bot = this.turnPlayer.bot
          if (bot.invokeCardSlot(this.turnCardIndex)) return // Next card invoked
          if (this.turnCardIndex < bot.cardSlots.length) moreSlotsExist = true
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
          this.actionType = 'lazor'
          this.remainingActionCount = this.turnPlayers.length
          for (const player of this.turnPlayers) player.bot.shoot()
          return
        } else this.progressTurnNextCardSlot()
      }
    }
  }
}
