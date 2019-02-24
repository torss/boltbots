precision mediump float;
precision mediump int;
uniform float time;
varying vec3 vPosition;
varying vec4 vColor;
varying vec2 vUv;
varying vec3 vDirection;

// See https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdSphere( vec3 p, float s ) {
  return length(p)-s;
}

float sdBox( vec3 p, vec3 b ) {
    vec3 d = abs(p) - b;
    return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float opSubtraction( float d1, float d2 ) { return max(-d1,d2); }

float sdTest( vec3 position ) {
  // return opSubtraction(sdSphere(position, 0.5 * cos(time * 0.05)), sdBox(position, vec3(0.5, 0.5, 0.5)));
  float timeMod = abs(cos(time * 0.05));
  return opSubtraction(sdBox(position, vec3(0.25, 0.5, 0.5)), sdSphere(position, 0.5 + 0.5 * timeMod));
}

void main()	{
  vec4 color = vec4( vColor );
  // color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
  vec3 position = vec3(vUv, 0.); // vPosition;
  const int maxSteps = 10;
  vec3 direction = vDirection / float(maxSteps); // vec3(0., 0., 10. / float(maxSteps));
  float dist;
  float hit = 0.;
  for (int i = 0; i < maxSteps; i++) {
    dist = sdTest(position + vec3(0., 0., 0.25));
    if (dist < 0.01) {
      hit = 1.; // float(i) / float(maxSteps);
      break;
    }
    position += direction;
  }
  color = vec4(hit, mod(dist, 0.1) * 10., 0., hit);
  // color = vec4(vPosition, 1.);
  gl_FragColor = color;
}
