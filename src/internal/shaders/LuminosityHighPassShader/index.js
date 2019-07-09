// Part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/shaders/LuminosityHighPassShader.js

import * as THREE from 'three'

import vertexShader from './LuminosityHighPass.vert.glsl'
import fragmentShader from './LuminosityHighPass.frag.glsl'

export const LuminosityHighPassShader = {
  vertexShader,
  fragmentShader,
  uniforms: {
    tDiffuse: { type: 't', value: null },
    luminosityThreshold: { type: 'f', value: 1.0 },
    smoothWidth: { type: 'f', value: 1.0 },
    defaultColor: { type: 'c', value: new THREE.Color(0x000000) },
    defaultOpacity: { type: 'f', value: 0.0 }
  }
}
