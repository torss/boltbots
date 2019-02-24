// Currently simple a sample from https://github.com/mrdoob/three.js/blob/master/examples/webgl_buffergeometry_rawshader.html
precision mediump float;
precision mediump int;
uniform float time;
varying vec3 vPosition;
varying vec4 vColor;
void main()	{
  vec4 color = vec4( vColor );
  color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
  gl_FragColor = color;
}
