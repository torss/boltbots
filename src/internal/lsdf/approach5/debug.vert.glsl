#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

uniform float scale;

in vec3 position;
in vec2 uv;
out vec2 vUv;

void main() {
  vUv = uv;

  vec3 transformed = vec3(position);
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
