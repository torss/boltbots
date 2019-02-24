// Currently simple a sample from https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_rawshader.html
precision mediump float;
precision mediump int;
uniform mat4 modelViewMatrix; // optional
uniform mat4 projectionMatrix; // optional
attribute vec3 position;
attribute vec4 color;
varying vec3 vPosition;
varying vec4 vColor;
void main()	{
  vPosition = position;
  vColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
