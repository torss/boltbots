#version 300 es

precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// uniform float size;
uniform float scale;

in vec3 position;
in vec3 normal;
in vec3 color;
flat out vec3 vNormal;
flat out vec3 vColor;

void main() {

  vColor = color;
  vNormal = normal;

  vec3 transformed = vec3(position);
  // #include <morphtarget_vertex>
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // gl_PointSize = size;
  // gl_PointSize *= (scale / -mvPosition.z);
  gl_PointSize = scale / -mvPosition.z;

  // vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
  // fogDepth = -mvPosition.z;
}
