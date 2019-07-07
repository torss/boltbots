/**
 * "Pass" part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/postprocessing/EffectComposer.js
 * Original rest of this comment block:
 *
 *
 * @author alteredq / http://alteredqualia.com/
 */

export class Pass {
  constructor () {
    // if set to true, the pass is processed by the composer
    this.enabled = true

    // if set to true, the pass indicates to swap read and write buffer after rendering
    this.needsSwap = true

    // if set to true, the pass clears its buffer before rendering
    this.clear = false

    // if set to true, the result of the pass is rendered to screen
    this.renderToScreen = false
  }

  setSize (width, height) {}

  render (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    console.error('THREE.Pass: .render() must be implemented in derived pass.')
  }
}
