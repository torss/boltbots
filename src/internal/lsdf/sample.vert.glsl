#version 300 es

precision mediump float;
precision mediump int;
uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional
uniform mat3 normalMatrix; // optional
uniform vec3 cameraPosition;
in vec3 position;
in vec4 color;
in vec3 normal;
in vec2 uv;
in vec3 shapeType;
out vec3 vPosition;
out vec4 vColor;
out vec2 vUv;
out vec3 vShapeType;
out vec3 vDirection;
void main()	{
  vPosition = position;
  vColor = color;
  vUv = uv;
  vShapeType = shapeType;
  vDirection = vPosition - cameraPosition;
  // vDirection = normalize( normalMatrix * normal ); // normalize( normalMatrix * vec3(uv, 0.) );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
