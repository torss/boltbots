import { init } from './Init'
import { Game } from './game'
import { assignNewVueObserver } from './Dereactivate'

/**
 * Global State
 */
class Glos {
  constructor () {
    this.darkMode = localStorage.getItem('darkMode') === 'true'
    this.muteAudio = localStorage.getItem('muteAudio') === 'true'
    this.masterVolume = parseInt(localStorage.getItem('masterVolume')) || 100

    this.game = new Game()
    this.cardSlots = []
    this.hand = []
    // this.vueGlos = {
    //   cardSlots: [],
    //   hand: []
    // }
    assignNewVueObserver(this)

    this.dragged = undefined
    this.threejsControls = undefined
    this.skyUniforms = undefined
    this.preAnimateFuncs = []
  }

  init (vueInstance) {
    const game = this.game
    game.threeTest = init(vueInstance)
    game.scene = game.threeTest.scene
    game.envMap = game.threeTest.material.envMap
    game.audioListener = game.threeTest.audioListener
    game.readyFunc = (game) => {
      this.adjustPlayerSelf()
      this.game.clock.start()
      this.preAnimateFuncs.push(() => {
        this.game.preAnimateFunc()
      })
    }
    game.asyncInit()
  }

  adjustPlayerSelf () {
    const playerSelf = this.game.match.playerSelf
    const vueGlos = this // .vueGlos
    vueGlos.cardSlots = playerSelf.bot.cardSlots
    vueGlos.hand = playerSelf.hand
  }

  adjustAudioVolume () {
    if (!this.game.audioListener) return
    this.game.audioListener.setMasterVolume(this.muteAudio ? 0 : this.masterVolume / 100)
  }
}

export const glos = new Glos()
