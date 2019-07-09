// Part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/shaders/CopyShader.js

import vertexShader from './Copy.vert.glsl'
import fragmentShader from './Copy.frag.glsl'

export const CopyShader = {
  vertexShader,
  fragmentShader,
  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 }
  }
}
