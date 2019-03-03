#version 300 es

precision mediump float;
precision mediump int;
precision mediump sampler3D;
uniform vec3 cameraPosition;
uniform float time;
uniform sampler2D typeMap;
uniform sampler3D volume;
uniform vec2 typeMapTexelSize;
uniform vec3 volumeTexelSize;
in vec3 vPosition;
in vec3 vRelpos;
in vec4 vColor;
in vec2 vUv;
flat in vec3 vShapeType;
// flat in float vLsdfConfig;
in vec3 vDirection;
flat in vec3 vNormal;
flat in float vDiagonalHalf;
flat in float vScale;
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

// const uint complexity = 16u;
// vec4 dataArray[complexity * 2u];

float sdTest0 (vec3 position, vec3 ofs) {
  ofs *= volumeTexelSize;
  return sdSphere(position + 0.5 * ofs, texture(volume, vShapeType + ofs).x);
}

float getSdf(vec3 position) {
  // return texture(volume, vShapeType + position).x;
  // return sdSphere(position, volumeTexelSize.x * abs(cos(time * 0.1)));
  // return sdSphere(position, volumeTexelSize.x * 0.5);
  // return sdSphere(position, texture(volume, vShapeType).x);

  return opUnion(
    opUnion(
      opUnion(
        sdTest0(position, vec3(0.5, 0.5, 0.5)),
        sdTest0(position, vec3(-0.5, 0.5, 0.5))
      ), opUnion(
        sdTest0(position, vec3(0.5, -0.5, 0.5)),
        sdTest0(position, vec3(-0.5, -0.5, 0.5))
      )
    ), opUnion(
      opUnion(
        sdTest0(position, vec3(0.5, 0.5, -0.5)),
        sdTest0(position, vec3(-0.5, 0.5, -0.5))
      ), opUnion(
        sdTest0(position, vec3(0.5, -0.5, -0.5)),
        sdTest0(position, vec3(-0.5, -0.5, -0.5))
      )
    )
  );
}

vec3 getSurfaceNormal(vec3 point) {
  const float eps = 0.01;
  return normalize(
      vec3(getSdf(point + vec3(eps, 0., 0.)) - getSdf(point - vec3(eps, 0., 0.)),
           getSdf(point + vec3(0., eps, 0.)) - getSdf(point - vec3(0., eps, 0.)),
           getSdf(point + vec3(0., 0., eps)) - getSdf(point - vec3(0., 0., eps))));
}

void main() {
  // for (uint i = 0u; i < complexity * 2u; ++i) {
  //   dataArray[i] = texture(typeMap, vec2(vShapeType.x + (float(i) * typeMapTexelSize.x), vShapeType.y));
  // }

  // vec4 color = vec4(0., 0., 0., 0.); // vec4(vColor);
  // // color.r += sin( vPosition.x * 10.0 + time ) * 0.5;
  // vec3 position = vPosition; // vec3(vUv, 0.); // vPosition;
  // const int maxSteps = 64;
  // vec3 rayDirection = normalize(vDirection); // normalize(vPosition - cameraPosition);
  // // float distanceMax = 2.;
  // // vec3 direction =
  // //     rayDirection / (float(maxSteps) / distanceMax); // vec3(0., 0., 10. / float(maxSteps));
  // float dist;
  // // float hit = 0.;
  // for (int i = 0; i < maxSteps; i++) {
  //   vec3 checkPosition = position; // + vec3(0., 0., 0.25);
  //   dist = getSdf(checkPosition);
  //   if (dist < 0.001) {
  //     // hit = 1.; // float(i) / float(maxSteps);
  //     color = simpleLambert(getSurfaceNormal(checkPosition), vec3(1., 1., 1.));
  //     break;
  //   }
  //   position += dist * rayDirection; // max(dist, 0.001) * rayDirection; // direction
  // }
  // // color = vec4(hit, mod(dist, 0.1) * 10., 0., hit);
  // // color = vec4(vPosition, 1.);
  // // color = 0.5 * color + 0.5 * vec4(abs(rayDirection), 1.);
  // // color = texture(typeMap, vShapeType.xy);
  // // color = vec4(texture(typeMap, vShapeType.xy).xyz / 16., 1.);
  // // switch (uint(vShapeType.z)) {
  // //   case 0u:
  // //     color = 0.5 * color + 0.5 * vec4(0., 1., 0., 1.);
  // //     break;
  // //   case 1u:
  // //     color = 0.5 * color + 0.5 * vec4(1., 1., 0., 1.);
  // //     break;
  // //   default:
  // //     color = 0.5 * color + 0.5 * vec4(1., 0., 0., 1.);
  // // }
  // // color = 0.5 * color + 0.5 * vec4(texture(typeMap, vShapeType.xy).a, 0, 0, 1.);
  // // color = 0.5 * color + 0.5 * texture(typeMap, vUv);
  // // color = texture(typeMap, vUv);
  // // gl_FragColor = color;

  vec4 color = vec4(0., 0., 0., 0.);
  vec3 rayDirection = normalize(vDirection);
  float distTotal = 0.;
  vec3 position = vRelpos * volumeTexelSize;
  vec3 offset = vec3(0., 0., 0.);
  const int maxSteps = 32;
  vec3 fixedStep = rayDirection * volumeTexelSize / float(maxSteps);
  float test = 0.;
  float dist = 0.;
  float hit = 0.;
  gl_FragDepth = 1000.;
  for (int i = 0; i < maxSteps; i++) {
    vec3 checkPosition = position;
    dist = getSdf(checkPosition);
    // if (dist < 0.001) {
    if (dist < 0.000) {
      gl_FragDepth = length((vPosition + float(i) * (rayDirection * vScale * 2. / float(maxSteps))) - cameraPosition) / 100.;
      hit = 1.;
      color = vec4(vRelpos + 0.5, 1.);
      // color = simpleLambert(getSurfaceNormal(checkPosition), vec3(1., 1., 1.));
      color = mix(color, simpleLambert(getSurfaceNormal(checkPosition), vec3(1., 1., 1.)), 0.25);
      break;
    }
    distTotal += dist;
    // if (distTotal >= vDiagonalHalf) break;
    // if (distTotal >= sqrt(0.75)) break;
    offset += fixedStep;
    // if (abs(offset.x) >= volumeTexelSize.x || abs(offset.y) >= volumeTexelSize.y || abs(offset.z) >= volumeTexelSize.z) break;
    position += fixedStep; // dist * rayDirection;
    test = float(i) / float(maxSteps);
  }
  // color = vec4(offset / volumeTexelSize + 0.5, 1.);
  // color = mix(vec4(test, test, test, 1.), color, hit);
  // color = vec4(mix(color.xyz, vNormal, 0.5), 1.);

  // float volumeValue = texture(volume, vShapeType + vRelpos * volumeTexelSize).x * 1000.;
  // color = vec4(volumeValue, -volumeValue, 0., 1.);
  // color = vec4(vNormal, 0.1);
  // color = vec4(vShapeType, 1.);
  // color = vec4(vUv, 0., 1.);
  // color = vec4(vRelpos + 0.5, 1.);
  // color = vec4(abs(rayDirection), 1.);
  outColor = color;
}
