// Part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/shaders/CopyShader.js

uniform float opacity;

uniform sampler2D tDiffuse;

varying vec2 vUv;

void main() {

  vec4 texel = texture2D( tDiffuse, vUv );
  gl_FragColor = opacity * texel;

}
