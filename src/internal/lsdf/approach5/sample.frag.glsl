#version 300 es

precision mediump float;
precision mediump int;

flat in vec3 vColor;
out vec4 outColor;

void main() {
  outColor = vec4(vColor, 1.);
}
