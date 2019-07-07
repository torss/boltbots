/**
 * "ClearMaskPass" part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/postprocessing/MaskPass.js
 * Original rest of this comment block:
 *
 *
 * @author alteredq / http://alteredqualia.com/
 */

import { Pass } from './Pass'

export class ClearMaskPass extends Pass {
  constructor () {
    super()

    this.needsSwap = false
  }

  render (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    renderer.state.buffers.stencil.setTest(false)
  }
}
