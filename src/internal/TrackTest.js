import * as THREE from 'three'

function genTrackPath (path, x, y, width, height, radius) {
  radius *= 0.5522847498307933984022516322796
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.bezierCurveTo(x + width, y, x + width, y + height, x + width - radius, y + height)
  path.lineTo(x + radius, y + height)
  path.bezierCurveTo(x, y + height, x, y, x + radius, y)
  return path
}

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

export function trackTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x20202,
    metalness: 0.10,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 10
  })

  const width = 0.6, height = 0.1, depth = 0.1
  const radius = 0.1
  const thickness = 0.05

  const shape = new THREE.Shape()
  genTrackPath(shape, 0, 0, width, height, radius)
  shape.holes.push(genTrackPath(new THREE.Shape(), thickness * 0.5, thickness * 0.5, width - thickness, height - thickness, radius))

  const extrudeSettings = {
    steps: 1,
    depth,
    bevelEnabled: false,
    curveSegments: 64
  }

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
  adjustGeometryNormals(geometry)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-0.5 * width, 0, -0.5 * depth)
  scene.add(mesh)
}
