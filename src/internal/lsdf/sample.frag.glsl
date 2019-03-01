#version 300 es

precision mediump float;
precision mediump int;
// uniform vec3 cameraPosition;
uniform float time;
uniform sampler2D typeMap;
uniform vec2 typeMapTexelSize;
in vec3 vPosition;
in vec4 vColor;
in vec2 vUv;
flat in vec3 vShapeType;
// flat in float vLsdfConfig;
in vec3 vDirection;
out vec4 outColor;

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

float opUnion(float d1, float d2) {  return min(d1, d2); }
float opSubtraction(float d1, float d2) { return max(-d1, d2); }
float opIntersection(float d1, float d2) { return max(d1, d2); }

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}
float opSmoothSubtraction(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 + d1) / k, 0.0, 1.0);
  return mix(d2, -d1, h) + k * h * (1.0 - h);
}
float opSmoothIntersection(float d1, float d2, float k) {
  float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) + k * h * (1.0 - h);
}

float sdTest(vec3 position, float testMod) {
  // return opSubtraction(sdSphere(position, 0.5 * cos(time * 0.05)),
  // sdBox(position, vec3(0.5, 0.5, 0.5)));
  // float timeMod = abs(cos(time * 0.05));
  float timeMod = abs(cos(time * 0.05 + texture(typeMap, vShapeType.xy).x));
  float sizeModBox = 1.5;
  float sizeModSphere = 0.5;
  return opSubtraction(sdBox(position, vec3(0.25 + testMod, timeMod * sizeModBox * 0.5, sizeModBox * 0.5)),
                       sdSphere(position, sizeModSphere));
  //return opSubtraction(sdBox(position, vec3(0.25, sizeModBox * 0.5, sizeModBox * 0.5)),
  //                     sdSphere(position, sizeModSphere * (0.5 + 0.5 * timeMod)));
  // return sdBox(position, vec3(0.25, sizeModBox * 0.5, sizeModBox * 0.5));
}

float getSdf(vec3 position) {
  switch (uint(vShapeType.z)) {
    // [LSDF TYPE TARGET] //
    default:
      return 0.;
  }

  // return sdTest(position - texture(typeMap, vShapeType.xy).xyz);

  // vec3 adjustedPosition = position - texture(typeMap, vShapeType.xy).xyz;
  // switch (uint(vShapeType.z)) {
  //   case 0u:
  //     return sdTest(adjustedPosition, 0.);
  //   case 1u:
  //     return sdTest(adjustedPosition, 0.5);
  //   case 2u:
  //     return opSubtraction(sdSphere(adjustedPosition, 0.5), sdBox(adjustedPosition, vec3(0.25, 0.5, 0.5)));
  //   default:
  //     return 0.;
  // }

  // GPU melting dynamic loop, so much for that idea I guess:
  /*
  float resultDist;
  vec2 uv = vShapeType.xy;
  bool first = true;
  for (; uv.x <= typeMapTexelSize.x; uv.x += typeMapTexelSize.x) { // vShapeType.z
    vec4 shapePrimary = texture(typeMap, uv);
    uv.x += typeMapTexelSize.x;
    vec4 shapeSecondary = texture(typeMap, uv);
    vec3 shapePosParam = position + shapePrimary.xyz;
    float shapeDist;
    if (shapePrimary.a >= 1.) { // Box
      shapeDist = sdBox(shapePosParam, shapeSecondary.xyz);
    } else { // Sphere
      shapeDist = sdSphere(shapePosParam, shapeSecondary.x);
    }
    if (first) {
      resultDist = shapeDist;
    } else {
      resultDist = opSubtraction(shapeDist, resultDist);
    }
    first = false;
  }
  return resultDist;
  */
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
  // color = texture(typeMap, vShapeType.xy);
  // color = vec4(texture(typeMap, vShapeType.xy).xyz / 16., 1.);
  // switch (uint(vShapeType.z)) {
  //   case 0u:
  //     color = 0.5 * color + 0.5 * vec4(0., 1., 0., 1.);
  //     break;
  //   case 1u:
  //     color = 0.5 * color + 0.5 * vec4(1., 1., 0., 1.);
  //     break;
  //   default:
  //     color = 0.5 * color + 0.5 * vec4(1., 0., 0., 1.);
  // }
  // color = 0.5 * color + 0.5 * vec4(texture(typeMap, vShapeType.xy).a, 0, 0, 1.);
  // color = 0.5 * color + 0.5 * texture(typeMap, vUv);
  // color = texture(typeMap, vUv);
  // gl_FragColor = color;
  outColor = color;
}
