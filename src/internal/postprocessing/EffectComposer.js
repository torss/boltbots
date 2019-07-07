/**
 * "EffectComposer" part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/159a40648ee86755220491d4f0bae202235a341c/examples/jsm/postprocessing/EffectComposer.js
 * Original rest of this comment block:
 *
 *
 * @author alteredq / http://alteredqualia.com/
 */

import * as THREE from 'three'
import { ShaderPass } from './ShaderPass'
import { CopyShader } from '../shaders'
import { MaskPass } from './MaskPass'
import { ClearMaskPass } from './ClearMaskPass'

export class EffectComposer {
  constructor (renderer, renderTarget) {
    this.renderer = renderer

    if (renderTarget === undefined) {
      const parameters = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        stencilBuffer: false
      }

      const size = renderer.getSize(new THREE.Vector2())
      this._pixelRatio = renderer.getPixelRatio()
      this._width = size.width
      this._height = size.height

      renderTarget = new THREE.WebGLRenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, parameters)
      renderTarget.texture.name = 'EffectComposer.rt1'
    } else {
      this._pixelRatio = 1
      this._width = renderTarget.width
      this._height = renderTarget.height
    }

    this.renderTarget1 = renderTarget
    this.renderTarget2 = renderTarget.clone()
    this.renderTarget2.texture.name = 'EffectComposer.rt2'

    this.writeBuffer = this.renderTarget1
    this.readBuffer = this.renderTarget2

    this.renderToScreen = true

    this.passes = []

    // dependencies

    // if (THREE.CopyShader === undefined) {
    //   console.error('THREE.EffectComposer relies on THREE.CopyShader')
    // }

    // if (THREE.ShaderPass === undefined) {
    //   console.error('THREE.EffectComposer relies on THREE.ShaderPass')
    // }

    this.copyPass = new ShaderPass(CopyShader)

    this.clock = new THREE.Clock()
  }

  swapBuffers () {
    const tmp = this.readBuffer
    this.readBuffer = this.writeBuffer
    this.writeBuffer = tmp
  }

  addPass (pass) {
    this.passes.push(pass)

    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2())
    pass.setSize(size.width, size.height)
  }

  insertPass (pass, index) {
    this.passes.splice(index, 0, pass)
  }

  isLastEnabledPass (passIndex) {
    for (let i = passIndex + 1; i < this.passes.length; ++i) {
      if (this.passes[ i ].enabled) return false
    }
    return true
  }

  render (deltaTime) {
    // deltaTime value is in seconds
    if (deltaTime === undefined) {
      deltaTime = this.clock.getDelta()
    }

    const currentRenderTarget = this.renderer.getRenderTarget()

    let maskActive = false

    let pass, i, il = this.passes.length

    for (i = 0; i < il; ++i) {
      pass = this.passes[ i ]

      if (pass.enabled === false) continue

      pass.renderToScreen = (this.renderToScreen && this.isLastEnabledPass(i))
      pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive)

      if (pass.needsSwap) {
        if (maskActive) {
          const context = this.renderer.context

          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff)

          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime)

          context.stencilFunc(context.EQUAL, 1, 0xffffffff)
        }

        this.swapBuffers()
      }

      // if (THREE.MaskPass !== undefined) {
      if (pass instanceof MaskPass) {
        maskActive = true
      } else if (pass instanceof ClearMaskPass) {
        maskActive = false
      }
      // }
    }

    this.renderer.setRenderTarget(currentRenderTarget)
  }

  reset (renderTarget) {
    if (renderTarget === undefined) {
      const size = this.renderer.getSize(new THREE.Vector2())
      this._pixelRatio = this.renderer.getPixelRatio()
      this._width = size.width
      this._height = size.height

      renderTarget = this.renderTarget1.clone()
      renderTarget.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio)
    }

    this.renderTarget1.dispose()
    this.renderTarget2.dispose()
    this.renderTarget1 = renderTarget
    this.renderTarget2 = renderTarget.clone()

    this.writeBuffer = this.renderTarget1
    this.readBuffer = this.renderTarget2
  }

  setSize (width, height) {
    this._width = width
    this._height = height

    const effectiveWidth = this._width * this._pixelRatio
    const effectiveHeight = this._height * this._pixelRatio

    this.renderTarget1.setSize(effectiveWidth, effectiveHeight)
    this.renderTarget2.setSize(effectiveWidth, effectiveHeight)

    for (let i = 0; i < this.passes.length; ++i) {
      this.passes[ i ].setSize(effectiveWidth, effectiveHeight)
    }
  }

  setPixelRatio (pixelRatio) {
    this._pixelRatio = pixelRatio
    this.setSize(this._width, this._height)
  }
};
