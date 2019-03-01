// Currently simple a sample from https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_rawshader.html
precision mediump float;
precision mediump int;
uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional
uniform mat3 normalMatrix; // optional
uniform vec3 cameraPosition;
attribute vec3 position;
attribute vec4 color;
attribute vec3 normal;
attribute vec2 uv;
varying vec3 vPosition;
varying vec4 vColor;
varying vec2 vUv;
varying vec3 vDirection;
void main()	{
  vPosition = position;
  vColor = color;
  vUv = uv;
  vDirection = vPosition - cameraPosition;
  // vDirection = normalize( normalMatrix * normal ); // normalize( normalMatrix * vec3(uv, 0.) );
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
