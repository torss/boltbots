import * as THREE from 'three'

export function pcgTest (scene, material) {
  const width = 1, height = 0.1
  const railWidth = 0.10
  const railHeight = 0.05

  const shape = new THREE.Shape()
  shape.moveTo(0, 0)
  shape.lineTo(0, height)
  shape.bezierCurveTo(0, height + railHeight, railWidth, height + railHeight, railWidth, height)
  shape.lineTo(width - railWidth, height)
  shape.bezierCurveTo(width - railWidth, height + railHeight, width, height + railHeight, width, height)
  shape.lineTo(width, 0)
  shape.lineTo(0, 0)

  const extrudeSettings = {
    steps: 1,
    depth: 1,
    bevelEnabled: false,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 0.1
  }

  const geometry = new THREE.ExtrudeBufferGeometry(shape, extrudeSettings)
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)
}
