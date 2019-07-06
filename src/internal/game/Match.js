import { ControlTower } from './ControlTower'

export class Match {
  constructor () {
    this.map = undefined
    this.players = []
    // this.playerSelfUid = -1
    this.playerSelf = undefined
    this.turn = 0
    this.turnPlayerIndex = 0
    this.controlTower = new ControlTower()
  }

  get turnPlayer () {
    return this.players[this.turnPlayerIndex]
  }
}