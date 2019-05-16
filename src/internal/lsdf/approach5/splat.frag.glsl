#version 300 es

precision mediump float;
precision mediump int;

flat in vec3 vNormal;
flat in vec3 vColor;
out vec4 outColor;

void main() {
  // outColor = vec4(vColor, 1.);
  outColor = vec4(vNormal * 0.5 + 0.5, 1.);
}
