/**
 * Slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/postprocessing/RenderPass.js
 * Original rest of this comment block:
 *
 *
 * @author alteredq / http://alteredqualia.com/
 */

import { Pass } from './Pass'

export class RenderPass extends Pass {
  constructor (scene, camera, overrideMaterial, clearColor, clearAlpha) {
    super()

    this.scene = scene
    this.camera = camera

    this.overrideMaterial = overrideMaterial

    this.clearColor = clearColor
    this.clearAlpha = (clearAlpha !== undefined) ? clearAlpha : 0

    this.clear = true
    this.clearDepth = false
    this.needsSwap = false
  }

  render (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    var oldAutoClear = renderer.autoClear
    renderer.autoClear = false

    this.scene.overrideMaterial = this.overrideMaterial

    var oldClearColor, oldClearAlpha

    if (this.clearColor) {
      oldClearColor = renderer.getClearColor().getHex()
      oldClearAlpha = renderer.getClearAlpha()

      renderer.setClearColor(this.clearColor, this.clearAlpha)
    }

    if (this.clearDepth) {
      renderer.clearDepth()
    }

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer)

    // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
    if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil)
    renderer.render(this.scene, this.camera)

    if (this.clearColor) {
      renderer.setClearColor(oldClearColor, oldClearAlpha)
    }

    this.scene.overrideMaterial = null
    renderer.autoClear = oldAutoClear
  }
}
