import * as THREE from 'three'

// https://github.com/mrdoob/three.js/issues/9862
function adjustGeometryNormals (geometry) {
  for (var i = 0; i < geometry.faces.length; i++) {
    var face = geometry.faces[ i ]
    if (face.materialIndex === 1) {
      for (var j = 0; j < face.vertexNormals.length; j++) {
        face.vertexNormals[ j ].z = 0
        face.vertexNormals[ j ].normalize()
      }
    }
  }
  return geometry
}

function genTrackCrossSection (path, x, y, width, height) {
  x -= 0.5 * width; y -= 0.5 * height
  path.moveTo(x, y)
  path.lineTo(x + width, y)
  path.lineTo(x + width, y + height)
  path.lineTo(x, y + height)
  return path
}

/*eslint-disable */
function genTrackExtrudePath (x, y, width, height, radius) {
  // const curvePath = new THREE.CatmullRomCurve3([
  //   new THREE.Vector3(x, y, 0),
  //   new THREE.Vector3(x + width, y, 0),
  //   new THREE.Vector3(x + width, y + height, 0),
  //   new THREE.Vector3(x, y + height, 0)
  // ])
  // curvePath.closed = true

  const curvePath = new THREE.CurvePath()
  const p0r = new THREE.Vector3(x + radius, y, 0)
  const p0 = new THREE.Vector3(x, y, 0)
  const p1r = new THREE.Vector3(x + width - radius, y, 0)
  const p1 = new THREE.Vector3(x + width, y, 0)
  const p2r = new THREE.Vector3(x + width - radius, y + height, 0)
  const p2 = new THREE.Vector3(x + width, y + height, 0)
  const p3r = new THREE.Vector3(x + radius, y + height, 0)
  const p3 = new THREE.Vector3(x, y + height, 0)
  curvePath.add(new THREE.LineCurve3(p0r, p1r))
  curvePath.add(new THREE.CubicBezierCurve3(p1r, p1, p2, p2r))
  curvePath.add(new THREE.LineCurve3(p2r, p3r))
  curvePath.add(new THREE.CubicBezierCurve3(p3r, p3, p0, p0r))

  return curvePath
}
/* eslint-enable */

export function trackTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x20202,
    metalness: 0.10,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 10
  })

  /*eslint-disable */
  const width = 0.6, height = 0.1, depth = 0.1
  const radius = 0.1
  const thickness = 0.05
  /* eslint-enable */

  const shape = new THREE.Shape()
  genTrackCrossSection(shape, 0, 0, depth, thickness)

  const extrudeSettings = {
    extrudePath: genTrackExtrudePath(0, 0, width, height, radius),
    steps: 100,
    depth,
    bevelEnabled: false,
    curveSegments: 64
  }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  adjustGeometryNormals(geometry)
  const mesh = new THREE.Mesh(geometry, material)
  // mesh.position.set(-0.5 * width, 0, -0.5 * depth)
  scene.add(mesh)
}
