import * as THREE from 'three'

function createBezierCircle (cx, cy, r, shape = new THREE.Shape()) {
  var c = 0.5522847498307933984022516322796

  shape.moveTo(cx, cy - r) // translate to centerpoint
  shape.bezierCurveTo(
    c * r, -r,
    r, -c * r,
    r, 0
  )
  // shape.moveTo(r, 0)
  shape.bezierCurveTo(
    r, c * r,
    c * r, r,
    0, r
  )
  // shape.moveTo(0, r)
  shape.bezierCurveTo(
    -c * r, r,
    -r, c * r,
    -r, 0
  )
  // shape.moveTo(-r, 0)
  shape.bezierCurveTo(
    -r, -c * r,
    -c * r, -r,
    0, -r
  )

  return shape
}

function genTrackPath (path, x, y, width, height, radius) {
  radius *= 0.5522847498307933984022516322796
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y) // path.bezierCurveTo(x + width, y + height, x + width, y, x + width - radius, y)
  path.bezierCurveTo(x + width, y, x + width, y + height, x + width - radius, y + height)
  // path.lineTo(x + width - radius, y + height)
  path.lineTo(x + radius, y + height) // path.bezierCurveTo(x, y, x, y + height, x + radius, y + height)
  path.bezierCurveTo(x, y + height, x, y, x + radius, y)
  // path.moveTo(x, y)
  // path.bezierCurveTo(x + width, y, x + width, y + width, x + width, y + width)
  // path.lineTo(x + width, y + width)
  // path.lineTo(x, y + width)
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

function test2 (scene, material) {
  var light = new THREE.PointLight()
  light.position.set(0, 20, 50)
  scene.add(light)

  var outerRadius = 10
  var innerRadius = 9

  var bezShape = createBezierCircle(0, 0, outerRadius)

  var bezHole = createBezierCircle(0, 0, innerRadius)
  bezShape.holes.push(bezHole)

  var extrudeSettings = {
    depth: 3,
    bevelEnabled: false,
    curveSegments: 40
    // material: 0,
    // extrudeMaterial: 1
  }

  var geometry = new THREE.ExtrudeGeometry(bezShape, extrudeSettings)

  geometry.computeVertexNormals()
  adjustGeometryNormals(geometry)

  material = new THREE.MultiMaterial([
    new THREE.MeshPhongMaterial({ color: 0x00ffff, shading: THREE.FlatShading }), // front
    new THREE.MeshPhongMaterial({ color: 0x00ffff, shading: THREE.SmoothShading }) // side
  ])

  var mesh = new THREE.Mesh(geometry, material)
  mesh.scale.set(0.1, 0.1, 0.1)
  mesh.position.set(0, 0, 0)

  scene.add(mesh)
}

export function trackTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x20202,
    metalness: 0.10,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 10
    // side: THREE.DoubleSide
  })

  /*eslint-disable */
  const width = 0.6, height = 0.1, depth = 0.1
  const radius = 0.1
  const thickness = 0.05
  /* eslint-enable */

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
  // geometry.computeVertexNormals()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(-0.5 * width, 0, -0.5 * depth)
  scene.add(mesh)

  // const geometry2 = new THREE.ExtrudeBufferGeometry(shape.holes[0], extrudeSettings)
  // const mesh2 = new THREE.Mesh(geometry2, [null, material])
  // mesh2.position.set(-0.5 * width, 0, -0.5 * depth)
  // scene.add(mesh2)

  test2(scene, material)
}
