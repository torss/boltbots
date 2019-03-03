#version 300 es

precision mediump float;
precision mediump int;

uniform sampler2D data0;
uniform sampler2D data1;
uniform sampler2D data2;

in vec2 vUv;
out vec4 outColor;

// - //
// See https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdSphere(vec3 p, float s) { return length(p) - s; }

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float opUnion(float d1, float d2) { return min(d1, d2); }
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
// - //

float compute() {
  vec4 v0 = texture(data0, vUv);
  vec4 v1 = texture(data1, vUv);
  vec4 v2 = texture(data2, vUv);
  switch (uint(v0.a)) {
  case 1u:
    return sdSphere(v2.xyz - v0.xyz, v1.x);
  case 2u:
    return sdBox(v2.xyz - v0.xyz, v1.xyz);
  case 3u:
    return opUnion(v0.x, v0.y);
  case 4u:
    return opSubtraction(v0.x, v0.y);
  case 5u:
    return opIntersection(v0.x, v0.y);
  case 6u:
    return opSmoothUnion(v0.x, v0.y, v0.z);
  case 7u:
    return opSmoothSubtraction(v0.x, v0.y, v0.z);
  case 8u:
    return opSmoothIntersection(v0.x, v0.y, v0.z);
  default:
    return 0.;
  }
}

void main() {
  outColor = vec4(compute(), 1., 1., 1.);
  outColor = vec4(vUv, 0., 1.);
}
