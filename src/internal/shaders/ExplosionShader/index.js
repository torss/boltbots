// Part of a slightly modified version of the original
// https://github.com/spite/vertex-displacement-noise-3d-webgl-glsl-three-js/tree/3ee8c6eb34eb1d4a8a3ccf5743c358c1c8c1b58c

import vertexShader from './ExplosionShader.vert.glsl'
import fragmentShader from './ExplosionShader.frag.glsl'

export const ExplosionShader = {
  vertexShader,
  fragmentShader,
  uniforms: {
    tExplosion: {
      type: 't',
      value: null
    },
    time: {
      type: 'f',
      value: 0.0
    }
  }
}
