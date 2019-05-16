#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D map;

in vec2 vUv;
out vec4 outColor;

void main() {
  // outColor = vec4(1., 0., 0., 1.);
  outColor = texture(map, vUv);
  // outColor = vec4(texture(map, vUv).x, 0., 0., 1.);
}
