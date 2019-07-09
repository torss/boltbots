// Part of a slightly modified version of the original
// https://github.com/spite/vertex-displacement-noise-3d-webgl-glsl-three-js/tree/3ee8c6eb34eb1d4a8a3ccf5743c358c1c8c1b58c

varying vec2 vUv;
varying float noise;
uniform sampler2D tExplosion;

float random(vec3 scale, float seed) {
  return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

void main() {
  float r = .01 * random(vec3(12.9898, 78.233, 151.7182), 0.0);
  vec2 tPos = vec2(0, 1.3 * noise + r);
  vec4 color = texture2D(tExplosion, tPos);
  gl_FragColor = vec4(color.rgb, 1.0);
}
