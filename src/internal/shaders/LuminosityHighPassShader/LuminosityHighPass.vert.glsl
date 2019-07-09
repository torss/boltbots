// Part of a slightly modified version of the original https://github.com/mrdoob/three.js/blob/eaa4f9dc511d3091443069db0f9c74093e29f943/examples/js/shaders/LuminosityHighPassShader.js

varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
