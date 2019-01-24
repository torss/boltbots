import * as THREE from 'three'

export function init (vueInstance) {
  const canvas = vueInstance.$refs.canvas

  const width = vueInstance.$el.clientWidth
  const height = vueInstance.$el.clientHeight

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10)
  camera.position.z = 1

  const scene = new THREE.Scene()

  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2)
  const material = new THREE.MeshNormalMaterial()

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const renderer = new THREE.WebGLRenderer({canvas, antialias: true})
  renderer.setSize(width, height)

  vueInstance.$resize = ({width, height}) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  vueInstance.$isDestroyed = false
  function animate () {
    if (vueInstance.$isDestroyed) return

    requestAnimationFrame(animate)

    mesh.rotation.x += 0.01
    mesh.rotation.y += 0.02

    renderer.render(scene, camera)
  }
  animate()

  vueInstance.$deinit = () => {
    vueInstance.$isDestroyed = true
    material.dispose()
    geometry.dispose()
    renderer.dispose()
  }
}
