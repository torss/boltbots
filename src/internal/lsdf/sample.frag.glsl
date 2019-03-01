precision mediump float;
precision mediump int;
// uniform vec3 cameraPosition;
uniform float time;
uniform sampler2D typeMap;
varying vec3 vPosition;
varying vec4 vColor;
varying vec2 vUv;
varying vec3 vShapeType;
varying vec3 vDirection;

// See https://www.alanzucconi.com/2016/07/01/surface-shading/
vec4 simpleLambert(vec3 surfaceNormal, vec3 color) {
  float timeMod = abs(cos(time * 0.05));
  float modDistance = 3.;
  vec3 lightDirection = normalize(vec3(modDistance * cos(timeMod), modDistance * sin(timeMod), 0.));
  vec3 lightColor = vec3(1., 1., 1.);
  float normalDotLightDirection = max(dot(surfaceNormal, lightDirection), 0.);
  vec4 resultColor;
  resultColor.rgb = color * lightColor * normalDotLightDirection;
  resultColor.a = 1.;
  return resultColor;
}

// See https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdSphere(vec3 p, float s) { return length(p) - s; }

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float opSubtraction(float d1, float d2) { return max(-d1, d2); }

float sdTest(vec3 position) {
  // return opSubtraction(sdSphere(position, 0.5 * cos(time * 0.05)),
  // sdBox(position, vec3(0.5, 0.5, 0.5)));
  // float timeMod = abs(cos(time * 0.05));
  float timeMod = abs(cos(time * 0.05 + texture2D(typeMap, vShapeType.xy).x));
  float sizeModBox = 1.5;
  float sizeModSphere = 0.5;
  return opSubtraction(sdBox(position, vec3(0.25, timeMod * sizeModBox * 0.5, sizeModBox * 0.5)),
                       sdSphere(position, sizeModSphere));
  //return opSubtraction(sdBox(position, vec3(0.25, sizeModBox * 0.5, sizeModBox * 0.5)),
  //                     sdSphere(position, sizeModSphere * (0.5 + 0.5 * timeMod)));
  // return sdBox(position, vec3(0.25, sizeModBox * 0.5, sizeModBox * 0.5));
}

float getSdf(vec3 position) {
  return sdTest(position - texture2D(typeMap, vShapeType.xy).xyz);
}

vec3 getSurfaceNormal(vec3 point) {
  const float eps = 0.01;
  return normalize(
      vec3(getSdf(point + vec3(eps, 0., 0.)) - getSdf(point - vec3(eps, 0., 0.)),
           getSdf(point + vec3(0., eps, 0.)) - getSdf(point - vec3(0., eps, 0.)),
           getSdf(point + vec3(0., 0., eps)) - getSdf(point - vec3(0., 0., eps))));
}

void main() {
  vec4 color = vec4(0., 0., 0., 0.); // vec4(vColor);
  // color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
  vec3 position = vPosition; // vec3(vUv, 0.); // vPosition;
  const int maxSteps = 1000;
  vec3 rayDirection = normalize(vDirection); // normalize(vPosition - cameraPosition);
  float distanceMax = 2.;
  vec3 direction =
      rayDirection / (float(maxSteps) / distanceMax); // vec3(0., 0., 10. / float(maxSteps));
  float dist;
  // float hit = 0.;
  for (int i = 0; i < maxSteps; i++) {
    vec3 checkPosition = position; // + vec3(0., 0., 0.25);
    dist = getSdf(checkPosition);
    if (dist < 0.01) {
      // hit = 1.; // float(i) / float(maxSteps);
      color = simpleLambert(getSurfaceNormal(checkPosition), vec3(1., 1., 1.));
      break;
    }
    position += direction;
  }
  // color = vec4(hit, mod(dist, 0.1) * 10., 0., hit);
  // color = vec4(vPosition, 1.);
  // color = 0.5 * color + 0.5 * vec4(abs(rayDirection), 1.);
  // color = texture2D(typeMap, vShapeType.xy);
  // color = texture2D(typeMap, vUv);
  gl_FragColor = color;
}
