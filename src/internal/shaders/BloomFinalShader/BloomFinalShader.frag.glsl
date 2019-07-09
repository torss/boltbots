// Part of a slightly modified version of the original
// https://github.com/mrdoob/three.js/blob/159a40648ee86755220491d4f0bae202235a341c/examples/webgl_postprocessing_unreal_bloom_selective.html

uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;

vec4 getTexture(sampler2D texelToLinearTexture) {
  return mapTexelToLinear(texture2D(texelToLinearTexture, vUv));
}

void main() {
  gl_FragColor =
      (getTexture(baseTexture) + vec4(1.0) * getTexture(bloomTexture));
}
