import * as THREE from 'three'
import { RrtGpu } from './RrtGpu'
import vertexShader from './sdfops.vert.glsl'
import fragmentShader from './sdfops.frag.glsl'
import { lsdfOpTypes } from '../LsdfOpType'

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
    for (let i = 0; i < 3; ++i) this.initDataTexture(i)
  }

  initDataTexture (i) {
    const data = new Float32Array(4 * this.capacity)
    const texture = new THREE.DataTexture(
      data,
      this.width,
      this.height,
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

  get dataTextures () {
    const dataTextures = {}
    for (let i = 0; i < 3; ++i) dataTextures[i] = this.material.uniforms['data' + i].value
    return dataTextures
  }

  static buildPlan (lsdfConfig) {
    const gpuStages = [[]]
    LsdfGpu.buildPlanStages(lsdfConfig, gpuStages)
    return gpuStages
  }

  static buildPlanStages (lsdfConfig, gpuStages) {
    const opType = lsdfOpTypes[lsdfConfig.type]
    let level
    if (opType.kind === 'combine') {
      const x = LsdfGpu.buildPlanStages(lsdfConfig.x, gpuStages)
      const y = LsdfGpu.buildPlanStages(lsdfConfig.y, gpuStages)
      level = Math.max(x, y)
      for (let i = gpuStages.length; i <= level; ++i) gpuStages.push([])
    } else {
      level = 0
    }
    gpuStages[level].push(lsdfConfig)
    return level + 1
  }
}
