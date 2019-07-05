import { init } from './Init'
import { Game } from './game'

/**
 * Global State
 */
class Glos {
  constructor () {
    this.game = new Game()
    this.dragged = undefined
    this.threejsControls = undefined
    this.skyUniforms = undefined
    this.preAnimateFuncs = []
    this.vueGlos = {
      cardSlots: [],
      hand: []
    }
  }

  init (vueInstance) {
    const game = this.game
    game.threeTest = init(vueInstance)
    game.scene = game.threeTest.scene
    game.envMap = game.threeTest.material.envMap
    game.readyFunc = (game) => {
      const vueGlos = this.vueGlos
      const playerSelf = game.match.playerSelf
      vueGlos.cardSlots = playerSelf.bot.cardSlots
      vueGlos.hand = playerSelf.hand
    }
    game.asyncInit()
  }
}

export const glos = new Glos()
