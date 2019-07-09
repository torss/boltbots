// Part of a slightly modified version of the original
// https://github.com/mrdoob/three.js/blob/159a40648ee86755220491d4f0bae202235a341c/examples/webgl_postprocessing_unreal_bloom_selective.html

import vertexShader from './BloomFinalShader.vert.glsl'
import fragmentShader from './BloomFinalShader.frag.glsl'

export const BloomFinalShader = {
  vertexShader,
  fragmentShader,
  uniforms: {
    baseTexture: { value: null },
    bloomTexture: { value: null }
  }
}
