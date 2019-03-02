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

float getSdf(vec3 position) {
  float stack[8];
  float result = 0.;
  for (uint i = 0u; i < 8u; ++i) {
    vec4 data0 = texture(typeMap, vec2(vShapeType.x + (float(i * 2u + 0u) * typeMapTexelSize.x), vShapeType.y));
    vec4 data1 = texture(typeMap, vec2(vShapeType.x + (float(i * 2u + 1u) * typeMapTexelSize.x), vShapeType.y));
    switch (uint(data0.a)) {
      case 0u: // Return
        return result;
      case 1u: // Sphere
        stack[i] = sdSphere(position - data0.xyz, data1.x);
        break;
      case 2u: // Box
        stack[i] = sdBox(position - data0.xyz, data1.xyz);
        break;
      case 3u:
        stack[i] = opUnion(stack[uint(data0.x)], stack[uint(data0.y)]);
        break;
      case 4u:
        stack[i] = opSubtraction(stack[uint(data0.x)], stack[uint(data0.y)]);
        break;
      case 5u:
        stack[i] = opIntersection(stack[uint(data0.x)], stack[uint(data0.y)]);
        break;
      case 6u:
        stack[i] = opSmoothUnion(stack[uint(data0.x)], stack[uint(data0.y)], data0.z);
        break;
      case 7u:
        stack[i] = opSmoothSubtraction(stack[uint(data0.x)], stack[uint(data0.y)], data0.z);
        break;
      case 8u:
        stack[i] = opSmoothIntersection(stack[uint(data0.x)], stack[uint(data0.y)], data0.z);
        break;
    }
    result = stack[i];
  }
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
  const int maxSteps = 64;
  vec3 rayDirection = normalize(vDirection); // normalize(vPosition - cameraPosition);
  // float distanceMax = 2.;
  // vec3 direction =
  //     rayDirection / (float(maxSteps) / distanceMax); // vec3(0., 0., 10. / float(maxSteps));
  float dist;
  // float hit = 0.;
  for (int i = 0; i < maxSteps; i++) {
    vec3 checkPosition = position; // + vec3(0., 0., 0.25);
    dist = getSdf(checkPosition);
    if (dist < 0.001) {
      // hit = 1.; // float(i) / float(maxSteps);
      color = simpleLambert(getSurfaceNormal(checkPosition), vec3(1., 1., 1.));
      break;
    }
    position += dist * rayDirection; // max(dist, 0.001) * rayDirection; // direction
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
