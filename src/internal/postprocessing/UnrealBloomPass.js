/**
 * Slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/postprocessing/UnrealBloomPass.js
 * Original rest of this comment block:
 *
 *
 * @author spidersharma / http://eduperiment.com/
 *
 * Inspired from Unreal Engine
 * https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/
 */

import * as THREE from 'three'
import { Pass } from './Pass'
import { LuminosityHighPassShader, CopyShader, UnrealBloomPassBlurShader, UnrealBloomPassCompositeShader } from '../shaders'
import { FullScreenQuad } from './FullScreenQuad'

export class UnrealBloomPass extends Pass {
  constructor (resolution, strength, radius, threshold) {
    super()

    this.strength = (strength !== undefined) ? strength : 1
    this.radius = radius
    this.threshold = threshold
    this.resolution = (resolution !== undefined) ? new THREE.Vector2(resolution.x, resolution.y) : new THREE.Vector2(256, 256)

    // create color only once here, reuse it later inside the render function
    this.clearColor = new THREE.Color(0, 0, 0)

    // render targets
    var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
    this.renderTargetsHorizontal = []
    this.renderTargetsVertical = []
    this.nMips = 5
    var resx = Math.round(this.resolution.x / 2)
    var resy = Math.round(this.resolution.y / 2)

    this.renderTargetBright = new THREE.WebGLRenderTarget(resx, resy, pars)
    this.renderTargetBright.texture.name = 'UnrealBloomPass.bright'
    this.renderTargetBright.texture.generateMipmaps = false

    for (var i = 0; i < this.nMips; i++) {
      var renderTargetHorizonal = new THREE.WebGLRenderTarget(resx, resy, pars)

      renderTargetHorizonal.texture.name = 'UnrealBloomPass.h' + i
      renderTargetHorizonal.texture.generateMipmaps = false

      this.renderTargetsHorizontal.push(renderTargetHorizonal)

      var renderTargetVertical = new THREE.WebGLRenderTarget(resx, resy, pars)

      renderTargetVertical.texture.name = 'UnrealBloomPass.v' + i
      renderTargetVertical.texture.generateMipmaps = false

      this.renderTargetsVertical.push(renderTargetVertical)

      resx = Math.round(resx / 2)

      resy = Math.round(resy / 2)
    }

    // luminosity high pass material

    // if (THREE.LuminosityHighPassShader === undefined) { console.error('THREE.UnrealBloomPass relies on THREE.LuminosityHighPassShader') }

    var highPassShader = LuminosityHighPassShader
    this.highPassUniforms = THREE.UniformsUtils.clone(highPassShader.uniforms)

    this.highPassUniforms[ 'luminosityThreshold' ].value = threshold
    this.highPassUniforms[ 'smoothWidth' ].value = 0.01

    this.materialHighPassFilter = new THREE.ShaderMaterial({
      uniforms: this.highPassUniforms,
      vertexShader: highPassShader.vertexShader,
      fragmentShader: highPassShader.fragmentShader,
      defines: {}
    })

    // Gaussian Blur Materials
    this.separableBlurMaterials = []
    var kernelSizeArray = [ 3, 5, 7, 9, 11 ]
    resx = Math.round(this.resolution.x / 2)
    resy = Math.round(this.resolution.y / 2)

    for (let i = 0; i < this.nMips; i++) {
      this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[ i ]))

      this.separableBlurMaterials[ i ].uniforms[ 'texSize' ].value = new THREE.Vector2(resx, resy)

      resx = Math.round(resx / 2)

      resy = Math.round(resy / 2)
    }

    // Composite material
    this.compositeMaterial = this.getCompositeMaterial(this.nMips)
    this.compositeMaterial.uniforms[ 'blurTexture1' ].value = this.renderTargetsVertical[ 0 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture2' ].value = this.renderTargetsVertical[ 1 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture3' ].value = this.renderTargetsVertical[ 2 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture4' ].value = this.renderTargetsVertical[ 3 ].texture
    this.compositeMaterial.uniforms[ 'blurTexture5' ].value = this.renderTargetsVertical[ 4 ].texture
    this.compositeMaterial.uniforms[ 'bloomStrength' ].value = strength
    this.compositeMaterial.uniforms[ 'bloomRadius' ].value = 0.1
    this.compositeMaterial.needsUpdate = true

    var bloomFactors = [ 1.0, 0.8, 0.6, 0.4, 0.2 ]
    this.compositeMaterial.uniforms[ 'bloomFactors' ].value = bloomFactors
    this.bloomTintColors = [ new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1),
      new THREE.Vector3(1, 1, 1), new THREE.Vector3(1, 1, 1) ]
    this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors

    // copy material
    // if (THREE.CopyShader === undefined) {
    //   console.error('THREE.BloomPass relies on THREE.CopyShader')
    // }

    var copyShader = CopyShader

    this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms)
    this.copyUniforms[ 'opacity' ].value = 1.0

    this.materialCopy = new THREE.ShaderMaterial({
      uniforms: this.copyUniforms,
      vertexShader: copyShader.vertexShader,
      fragmentShader: copyShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true
    })

    this.enabled = true
    this.needsSwap = false

    this.oldClearColor = new THREE.Color()
    this.oldClearAlpha = 1

    this.basic = new THREE.MeshBasicMaterial()

    this.fsQuad = new FullScreenQuad(null)
  }

  dispose () {
    for (let i = 0; i < this.renderTargetsHorizontal.length; ++i) {
      this.renderTargetsHorizontal[ i ].dispose()
    }

    for (let i = 0; i < this.renderTargetsVertical.length; ++i) {
      this.renderTargetsVertical[ i ].dispose()
    }

    this.renderTargetBright.dispose()
  }

  setSize (width, height) {
    var resx = Math.round(width / 2)
    var resy = Math.round(height / 2)

    this.renderTargetBright.setSize(resx, resy)

    for (var i = 0; i < this.nMips; i++) {
      this.renderTargetsHorizontal[ i ].setSize(resx, resy)
      this.renderTargetsVertical[ i ].setSize(resx, resy)

      this.separableBlurMaterials[ i ].uniforms[ 'texSize' ].value = new THREE.Vector2(resx, resy)

      resx = Math.round(resx / 2)
      resy = Math.round(resy / 2)
    }
  }

  render (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    this.oldClearColor.copy(renderer.getClearColor())
    this.oldClearAlpha = renderer.getClearAlpha()
    var oldAutoClear = renderer.autoClear
    renderer.autoClear = false

    renderer.setClearColor(this.clearColor, 0)

    if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST)

    // Render input to screen

    if (this.renderToScreen) {
      this.quad.material = this.basic
      this.basic.map = readBuffer.texture

      renderer.setRenderTarget(null)
      renderer.clear()
      this.fsQuad.render(renderer)
    }

    // 1. Extract Bright Areas

    this.highPassUniforms[ 'tDiffuse' ].value = readBuffer.texture
    this.highPassUniforms[ 'luminosityThreshold' ].value = this.threshold
    this.fsQuad.material = this.materialHighPassFilter

    renderer.setRenderTarget(this.renderTargetBright)
    renderer.clear()
    this.fsQuad.render(renderer)

    // 2. Blur All the mips progressively

    const BlurDirectionX = new THREE.Vector2(1.0, 0.0)
    const BlurDirectionY = new THREE.Vector2(0.0, 1.0)

    var inputRenderTarget = this.renderTargetBright

    for (var i = 0; i < this.nMips; i++) {
      this.fsQuad.material = this.separableBlurMaterials[ i ]

      this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = inputRenderTarget.texture
      this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = BlurDirectionX
      renderer.setRenderTarget(this.renderTargetsHorizontal[ i ])
      renderer.clear()
      this.fsQuad.render(renderer)

      this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = this.renderTargetsHorizontal[ i ].texture
      this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = BlurDirectionY
      renderer.setRenderTarget(this.renderTargetsVertical[ i ])
      renderer.clear()
      this.fsQuad.render(renderer)

      inputRenderTarget = this.renderTargetsVertical[ i ]
    }

    // Composite All the mips

    this.fsQuad.material = this.compositeMaterial
    this.compositeMaterial.uniforms[ 'bloomStrength' ].value = this.strength
    this.compositeMaterial.uniforms[ 'bloomRadius' ].value = this.radius
    this.compositeMaterial.uniforms[ 'bloomTintColors' ].value = this.bloomTintColors

    renderer.setRenderTarget(this.renderTargetsHorizontal[ 0 ])
    renderer.clear()
    this.fsQuad.render(renderer)

    // Blend it additively over the input texture

    this.fsQuad.material = this.materialCopy
    this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetsHorizontal[ 0 ].texture

    if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST)

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
      this.fsQuad.render(renderer)
    } else {
      renderer.setRenderTarget(readBuffer)
      this.fsQuad.render(renderer)
    }

    // Restore renderer settings

    renderer.setClearColor(this.oldClearColor, this.oldClearAlpha)
    renderer.autoClear = oldAutoClear
  }

  getSeperableBlurMaterial (kernelRadius) {
    return new THREE.ShaderMaterial({

      defines: {
        'KERNEL_RADIUS': kernelRadius,
        'SIGMA': kernelRadius
      },

      uniforms: {
        'colorTexture': { value: null },
        'texSize': { value: new THREE.Vector2(0.5, 0.5) },
        'direction': { value: new THREE.Vector2(0.5, 0.5) }
      },

      ...UnrealBloomPassBlurShader
    })
  }

  getCompositeMaterial (nMips) {
    return new THREE.ShaderMaterial({

      defines: {
        'NUM_MIPS': nMips
      },

      uniforms: {
        'blurTexture1': { value: null },
        'blurTexture2': { value: null },
        'blurTexture3': { value: null },
        'blurTexture4': { value: null },
        'blurTexture5': { value: null },
        'dirtTexture': { value: null },
        'bloomStrength': { value: 1.0 },
        'bloomFactors': { value: null },
        'bloomTintColors': { value: null },
        'bloomRadius': { value: 0.0 }
      },

      ...UnrealBloomPassCompositeShader
    })
  }
};
