import { init } from './Init'
import { Game } from './game'

/**
 * Global State
 */
class Glos {
  constructor () {
    this.game = new Game()
    this.vueGlos = {
      cardSlots: []
    }
  }

  init (vueInstance) {
    const game = this.game
    game.threeTest = init(vueInstance)
    game.scene = game.threeTest.scene
    game.envMap = game.threeTest.material.envMap
    game.readyFunc = (game) => {
      this.vueGlos.cardSlots = game.match.playerSelf.cardSlots
    }
    game.asyncInit()
  }
}

export const glos = new Glos()
