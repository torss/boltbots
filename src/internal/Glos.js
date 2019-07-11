import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { init } from './Init'
import { Game } from './game'
import { assignNewVueObserver } from './Dereactivate'

/**
 * Global State
 */
class Glos {
  constructor () {
    const oldTweens = [...Object.values(TWEEN._tweens)]
    for (const tween of oldTweens) tween.stop()

    const getLsOrDefault = (key, def, conv) => {
      const ls = localStorage.getItem(key)
      if (ls === null) return def
      return conv ? conv(ls) : ls
    }
    const lsConvBool = ls => ls === 'true'
    this.darkMode = getLsOrDefault('darkMode', true, lsConvBool)
    this.muteAudio = getLsOrDefault('muteAudio', false, lsConvBool)
    this.masterVolume = getLsOrDefault('masterVolume', 100, parseInt)
    this.leftDrawerOpen = getLsOrDefault('leftDrawerOpen', true, lsConvBool)
    this.rightDrawerOpen = getLsOrDefault('rightDrawerOpen', false, lsConvBool)
    this.hostExpanded = getLsOrDefault('hostExpanded', false, lsConvBool)
    this.joinExpanded = getLsOrDefault('joinExpanded', true, lsConvBool)
    this.playerName = getLsOrDefault('playerName', '')
    this.hostMatchName = getLsOrDefault('hostMatchName', '')
    this.hostMaxPlayers = getLsOrDefault('hostMaxPlayers', 4, parseInt)
    this.hostSeed = getLsOrDefault('hostSeed', '')
    this.hostEndTurnTimeLimit = getLsOrDefault('hostEndTurnTimeLimit', 15, parseInt)
    this.hostCheckpointCount = getLsOrDefault('hostCheckpointCount', 3, parseInt)
    this.hostHandSize = getLsOrDefault('hostHandSize', 8, parseInt)
    this.hostSlotCount = getLsOrDefault('hostSlotCount', 5, parseInt)
    this.dialogData = undefined

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

// NOTE prototype only
window.glos = glos
window.game = glos.game
window.THREE = THREE
window.TWEEN = TWEEN
