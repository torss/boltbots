// Cf. https://threejs.org/docs/index.html#api/en/renderers/WebGLRenderer.readRenderTargetPixels
// Cf. https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_cubes_gpu.html
// Cf. https://github.com/mrdoob/three.js/blob/dev/examples/js/GPUComputationRenderer.js

import * as THREE from 'three'
import passthroughVertexShader from './passthrough.vert.glsl'

/**
 * Read-Render-Target GPU compute
 */
export class RrtGpu {
  constructor (renderer, material, renderTargetSize, renderTargetOptions = {}) {
    renderer.extensions.get('EXT_color_buffer_float')
    if (!material.vertexShader) material.vertexShader = passthroughVertexShader
    this.renderer = renderer
    this.scene = new THREE.Scene()
    this.camera = new THREE.Camera()
    this.camera.position.z = 1
    this.mesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), material)
    this.scene.add(this.mesh)
    this.renderTarget = new THREE.WebGLRenderTarget(renderTargetSize.x, renderTargetSize.y, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      ...renderTargetOptions,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      stencilBuffer: false,
      depthBuffer: false
    })
    // FIXME // this.renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat })
    this.output = new Float32Array(4 * this.renderTarget.width * this.renderTarget.height)
  }

  get material () {
    return this.mesh.material
  }

  dispose () {
    this.renderTarget.dispose()
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }

  compute (readRenderTarget = true, scene, camera) {
    const currentRenderTarget = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.setClearColor(new THREE.Color(0, 0, Math.cos(performance.now() * 0.0005)), 1)
    this.renderer.clear()
    // TODO deactivate autoClear ? https://threejs.org/docs/#api/en/renderers/WebGLRenderer.render
    this.renderer.render(this.scene, this.camera)
    // if (scene && camera) this.renderer.render(scene, camera) // FIXME
    this.renderer.setClearColor(new THREE.Color(1, 0, 0), 1)
    if (readRenderTarget) this.readRenderTarget()
    this.renderer.setRenderTarget(currentRenderTarget)
    return this
  }

  readRenderTarget () {
    const renderTarget = this.renderTarget
    this.renderer.readRenderTargetPixels(renderTarget, 0, 0, renderTarget.width, renderTarget.height, this.output)
    return this
  }
}
