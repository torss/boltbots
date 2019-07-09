// Note that this isn't about testing the original threejs ExtrudeGeometry.js,
// but instead about testing / extending the custom ExtrudeGeometry.js version.

import * as THREE from 'three'
import { ExtrudeBufferGeometry } from './ExtrudeGeometry'

/* eslint-disable no-unused-vars */

export function extrudeTest (scene, materialParam) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.20,
    roughness: 0.80,
    envMap: materialParam.envMap,
    envMapIntensity: 10
  })
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff2200,
    metalness: 0.95,
    roughness: 0.05,
    envMap: materialParam.envMap,
    envMapIntensity: 1
  })
  const material3 = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    emissive: 0x22ff00,
    metalness: 0.95,
    roughness: 0.05,
    envMap: materialParam.envMap,
    envMapIntensity: 1
  })

  const width = 0.1
  const height = 0.1
  const depth = 0.1

  const shape = genTestShape(width, height)

  const extrudeSettings = {
    extrudePath: genTestExtrudePath(height * 3),
    steps: 10,
    curveSegments: 16,
    depth,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    vertMod (vert, step, steps) {
      return vert.clone().rotateAround(new THREE.Vector2(0.05, 0.05), 2 * Math.PI * (step / steps))
    }
  }

  const geometry = new ExtrudeBufferGeometry(shape, extrudeSettings)
  const geometryThree = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings)
  const mesh = new THREE.Mesh(geometry, material)
  // mesh.position.set(-0.5 * width, 0, -0.5 * depth)
  scene.add(mesh)
  scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material2))
  scene.add(new THREE.LineSegments(new THREE.WireframeGeometry(geometryThree), material3))
}

function genTestShape (width, height) {
  const path = new THREE.Shape()
  const radius = (width / 2) * 0.5522847498307933984022516322796
  const x = 0, y = 0
  path.moveTo(x + radius, y)
  path.lineTo(x + width - radius, y)
  path.lineTo(x + width, y + height) // path.bezierCurveTo(x + width, y, x + width, y + height, x + width - radius, y + height)
  path.lineTo(x + radius, y + height)
  path.bezierCurveTo(x, y + height, x, y, x + radius, y)
  return path
}

function genTestExtrudePath (height) {
  const curvePath = new THREE.CurvePath()
  var c = 0.5522847498307933984022516322796
  const r = height
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
}
