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
    this.output = new Float32Array(4 * this.capacity)
  }

  get material () {
    return this.mesh.material
  }

  get width () {
    return this.renderTarget.width
  }

  get height () {
    return this.renderTarget.height
  }

  get capacity () {
    return this.width * this.height
  }

  dispose () {
    this.renderTarget.dispose()
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }

  compute (readRenderTarget = true) {
    const currentRenderTarget = this.renderer.getRenderTarget()
    this.renderer.setRenderTarget(this.renderTarget)
    this.renderer.render(this.scene, this.camera)
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
