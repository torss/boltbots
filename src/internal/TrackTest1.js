import * as THREE from 'three'

/* eslint-disable no-unused-vars */

// https://github.com/mrdoob/three.js/issues/9862
// function adjustGeometryNormals (geometry) {
//   for (var i = 0; i < geometry.faces.length; i++) {
//     var face = geometry.faces[ i ]
//     if (face.materialIndex === 1) {
//       for (var j = 0; j < face.vertexNormals.length; j++) {
//         face.vertexNormals[ j ].z = 0
//         face.vertexNormals[ j ].normalize()
//       }
//     }
//   }
//   return geometry
// }

// https://en.wikipedia.org/wiki/Continuous_track#/media/File:Tracks_(diagram).png
function genDriveWheelCrossSection (width, height, protrusion, path = new THREE.Shape()) {
  const track = protrusion
  const inner = width / 2
  const proth = protrusion / 2
  const wh = 0.5 * width
  const wp = wh + protrusion
  const hh = height
  path.moveTo(-inner, hh)
  path.lineTo(-wp, proth)
  path.lineTo(-wh, 0)
  path.bezierCurveTo(-wh, track, wh, track, wh, 0) // path.lineTo(wh, 0)
  path.lineTo(wp, proth)
  path.lineTo(inner, hh)

  // let x = -0.5 * width - protrusion, y = 0

  // const track = protrusion
  // x = -0.5 * width - protrusion; y = 0 // -1 * height
  // path.moveTo(x, y + height - track)
  // path.lineTo(x + protrusion, y)
  // path.bezierCurveTo(x, y + track, x + width, y + track, x + width, y) // path.lineTo(x + width, y)
  // path.lineTo(x + width + protrusion, y + height - track)
  // path.lineTo(x, y + height)

  // path.moveTo(x, y)
  // path.lineTo(x + protrusion, y + height)
  // path.lineTo(x + protrusion + width, y + height)
  // path.lineTo(x + protrusion + width, y)

  // const radius = 0.1 * 0.5522847498307933984022516322796
  // x = 0
  // y = 0
  // width = 0.6
  // height = 0.5
  // path.moveTo(x + radius, y)
  // path.lineTo(x + width - radius, y)
  // path.bezierCurveTo(x + width, y, x + width, y + height, x + width - radius, y + height)
  // path.lineTo(x + radius, y + height)
  // path.bezierCurveTo(x, y + height, x, y, x + radius, y)

  // path.moveTo(x, y)
  // x += protrusion
  // y += height
  // path.lineTo(x, y)
  // x += width
  // path.lineTo(x, y)

  return path
}

function genDriveWheelExtrudePath (height) {
  // return createBezierCircle(0, 0, height * 10)

  const curvePath = new THREE.CurvePath()
  var c = 0.5522847498307933984022516322796
  const r = height
  // curvePath.add(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, height, 0)))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, -r, 0),
    new THREE.Vector3(c * r, -r, 0),
    new THREE.Vector3(r, -c * r, 0),
    new THREE.Vector3(r, 0, 0)
  ))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(r, 0, 0),
    new THREE.Vector3(r, c * r, 0),
    new THREE.Vector3(c * r, r, 0),
    new THREE.Vector3(0, r, 0)
  ))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, r, 0),
    new THREE.Vector3(-c * r, r, 0),
    new THREE.Vector3(-r, c * r, 0),
    new THREE.Vector3(-r, 0, 0)
  ))
  curvePath.add(new THREE.CubicBezierCurve3(
    new THREE.Vector3(-r, 0, 0),
    new THREE.Vector3(-r, -c * r, 0),
    new THREE.Vector3(-c * r, -r, 0),
    new THREE.Vector3(0, -r, 0)
  ))
  return curvePath

  // const curvePath = new THREE.CurvePath()
  // const p0 = new THREE.Vector3(0, 0, 0)
  // const p1 = new THREE.Vector3(0, height, 0)
  // curvePath.add(new THREE.LineCurve3(p0, p1))
  // return curvePath

  // const curvePath = new THREE.CurvePath()
  // curvePath.add(new THREE.EllipseCurve(
  //   0, 0, // ax, aY
  //   height, height, // xRadius, yRadius
  //   0, 2 * Math.PI, // aStartAngle, aEndAngle
  //   false, // aClockwise
  //   0 // aRotation
  // ))
  // return curvePath

  // return new THREE.EllipseCurve(
  //   0, 0, // ax, aY
  //   height, height, // xRadius, yRadius
  //   0, 2 * Math.PI, // aStartAngle, aEndAngle
  //   false, // aClockwise
  //   0 // aRotation
  // )
}

function genTrackCrossSection (path, x, y, width, height, radius) {
  x -= 0.5 * width; y -= 0.5 * height
  path.moveTo(x, y)
  path.lineTo(x + width, y)
  path.bezierCurveTo(x + width + radius, y, x + width + radius, y + height, x + width, y + height)
  // path.lineTo(x + width, y + height)
  path.lineTo(x, y + height)
  path.bezierCurveTo(x - radius, y + height, x - radius, y, x, y)
  return path
}

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

export function trackTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x20202, // 0x20202,
    metalness: 0.10,
    roughness: 0.90,
    envMap: materialParam.envMap,
    envMapIntensity: 20
  })
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.15,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 15
  })

  const width = 0.6, height = 0.1, depth = 0.1
  const radius = 0.1
  const thickness = 0.05
  const roundedWidth = 0.05

  const shape = new THREE.Shape()
  genTrackCrossSection(shape, 0, 0, depth, thickness, roundedWidth)

  const extrudeSettings = {
    extrudePath: genTrackExtrudePath(0, 0, width, height, radius),
    steps: 200,
    // depth,
    bevelEnabled: false,
    curveSegments: 64
  }

  const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings)
  // adjustGeometryNormals(geometry)
  const mesh = new THREE.Mesh(geometry, material)
  // mesh.position.set(-0.5 * width, 0, -0.5 * depth)
  scene.add(mesh)

  const protrusion = 0.025
  const extrudeSettings2 = {
    extrudePath: genDriveWheelExtrudePath(height - thickness), // extrudeSettings.extrudePath, // genDriveWheelExtrudePath(height),
    steps: 64,
    // depth: depth + roundedWidth,
    bevelEnabled: false,
    curveSegments: 64
  }
  //   delete extrudeSettings.extrudePath //
  const shape2 = genDriveWheelCrossSection(depth + roundedWidth + protrusion, height - thickness, protrusion) // shape
  const geometry2 = new THREE.ExtrudeBufferGeometry(shape2, extrudeSettings2)
  const xos = 3
  const xowidth = (width + 1.5 * (height - thickness)) / xos
  for (let x = 0; x < xos; ++x) {
    const mesh2 = new THREE.Mesh(geometry2, material2)
    mesh.add(mesh2)
    mesh2.position.set(radius - 0.5 * (height - thickness) + x * xowidth, thickness, 0)
  }
}
