import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'

export class Sfxf {
  constructor (game) {
    this.game = game
    this.defaultVolume = 1
  }

  get audioListener () {
    return this.game.audioListener
  }

  get context () {
    return this.audioListener.context
  }

  createPrimitve (type, freq) {
    const gain = this.context.createGain()
    gain.gain.value = 0
    const oscillator = this.context.createOscillator()
    oscillator.type = type
    oscillator.frequency.value = freq
    oscillator.connect(gain)
    oscillator.start()
    return { gain, oscillator }
  }

  createTween (type, freq, freqInc, freqIncDelay, freqIncCount, volume) {
    if (volume === undefined) volume = this.defaultVolume
    const { gain, oscillator } = this.createPrimitve(type, freq)
    let i = 0
    const tween = new TWEEN
      .Tween({})
      .to({}, 0)
      .delay(freqIncDelay)
      .repeat(freqIncCount)
      .onUpdate(() => {
        oscillator.frequency.value += freqInc
        gain.gain.value = volume * (1 - (i / freqIncCount))
        ++i
      })
    return {
      gain,
      oscillator,
      tween
    }
  }

  createPosAudio (type, freq, freqInc, freqIncDelay, freqIncCount, volume) {
    const { gain, oscillator, tween } = this.createTween(type, freq, freqInc, freqIncDelay, freqIncCount, volume)
    const posAudio = new THREE.PositionalAudio(this.audioListener)
    posAudio.setNodeSource(gain)
    return { posAudio, tween, oscillator }
  }

  createPosAudioStarted (type, freq, freqInc, freqIncDelay, freqIncCount, volume) {
    const { posAudio, tween, oscillator } = this.createPosAudio(type, freq, freqInc, freqIncDelay, freqIncCount, volume)
    tween
      .onComplete(() => {
        oscillator.stop()
        if (posAudio.parent) posAudio.parent.remove(posAudio)
      })
      .start()
    return posAudio
  }

  cpasShoot () {
    // return this.createPosAudioStarted('square', 200, 50, 30, 15)
    const obj = new THREE.Object3D()
    obj.add(this.createPosAudioStarted('square', 200, 10, 20, 10))
    obj.add(this.createPosAudioStarted('sawtooth', 300, -40, 40, 10))
    obj.add(this.createPosAudioStarted('square', 2000, -200, 40, 10))
    return obj
  }

  cpasHit () {
    const obj = new THREE.Object3D()
    obj.add(this.createPosAudioStarted('square', 200, -8, 10, 20))
    obj.add(this.createPosAudioStarted('sawtooth', 80, -4, 10, 25))
    obj.add(this.createPosAudioStarted('square', 100, 15, 5, 20))
    obj.add(this.createPosAudioStarted('square', 180, -10, 10, 40))
    return obj
  }

  cpasShove () {
    return this.createPosAudioStarted('square', 150, -15, 30, 15)
  }

  cpasCrush () {
    return this.createPosAudioStarted('sawtooth', 150, -15, 30, 15, 2)
  }

  cpasExplode () {
    const obj = new THREE.Object3D()
    const volume = 1.5
    const lmod = 3
    const lmod2 = 1
    // obj.add(this.createPosAudioStarted('square', 125, -15, 10, 50, volume))
    // obj.add(this.createPosAudioStarted('square', 150, -7, 20, 100, volume))
    // obj.add(this.createPosAudioStarted('square', 50, 2, 25, 20, volume))
    // obj.add(this.createPosAudioStarted('sawtooth', 300, -3, 10, 100, volume))

    obj.add(this.createPosAudioStarted('sawtooth', 200, -8 / lmod, 10, 15 * lmod))
    obj.add(this.createPosAudioStarted('sawtooth', 80, -4 / lmod, 10, 15 * lmod))
    obj.add(this.createPosAudioStarted('sawtooth', 100, 15 / lmod, 5, 10 * lmod))
    obj.add(this.createPosAudioStarted('sawtooth', 180, -10 / lmod, 10, 20 * lmod))

    obj.add(this.createPosAudioStarted('triangle', 10, 1 / lmod2, 100, 10 * lmod2, volume))
    obj.add(this.createPosAudioStarted('square', 100, -10 / lmod2, 100, 10 * lmod2, volume))
    obj.add(this.createPosAudioStarted('sine', 100, -10 / lmod2, 100, 10 * lmod2, volume))
    return obj
  }
}
