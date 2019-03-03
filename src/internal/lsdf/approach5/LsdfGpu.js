import * as THREE from 'three'
import {RrtGpu} from './RrtGpu'
import vertexShader from './sdfops.vert.glsl'
import fragmentShader from './sdfops.frag.glsl'

export class LsdfGpu extends RrtGpu {
  constructor (renderer, renderTargetSize) {
    const material = new THREE.RawShaderMaterial({
      uniforms: {
        data0: new THREE.Uniform(),
        data1: new THREE.Uniform(),
        data2: new THREE.Uniform()
      },
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      colorWrite: true
    })
    super(renderer, material, renderTargetSize)
    for (let i = 0; i < 3; ++i) this.initDataTexture(i, renderTargetSize)
  }

  initDataTexture (i, renderTargetSize) {
    const data = new Float32Array(4 * renderTargetSize)
    const texture = new THREE.DataTexture(
      data,
      renderTargetSize.x,
      renderTargetSize.y,
      THREE.RGBAFormat,
      THREE.FloatType,
      undefined,
      THREE.ClampToEdgeWrapping,
      THREE.ClampToEdgeWrapping,
      THREE.NearestFilter,
      THREE.NearestFilter
    )
    this['data' + i] = data
    this.material.uniforms['data' + i].value = texture
  }

  dispose () {
    super.dispose()
    for (let i = 0; i < 3; ++i) this.material.uniforms['data' + i].value.dispose()
  }
}
