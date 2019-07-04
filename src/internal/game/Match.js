export class Match {
  constructor () {
    this.players = []
    // this.playerSelfUid = -1
    this.playerSelf = undefined
    this.turn = 0
    this.turnPlayerIndex = 0
  }

  get turnPlayer () {
    return this.players[this.turnPlayerIndex]
  }

  nextTurn () {
    this.progressTurn()
    // TODO
  }

  /**
   * Progress within turn (next player)
   */
  progressTurn () {
    this.turnPlayer.bot.object3d.position.z += 1
    // TODO
  }
}
