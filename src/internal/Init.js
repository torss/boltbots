import * as THREE from 'three'
import GLTFLoader from 'three-gltf-loader'

export function init (vueInstance) {
  const canvas = vueInstance.$refs.canvas

  const width = 1 // vueInstance.$el.clientWidth
  const height = 1 // vueInstance.$el.clientHeight

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10)
  camera.position.z = 1

  const scene = new THREE.Scene()

  const material = new THREE.MeshNormalMaterial()
  let mesh
  const loader = new GLTFLoader()
  loader.load('../statics/DeltaArrow.glb', (gltf) => {
    mesh = gltf.scene.children[0]
    mesh.material = material
    mesh.scale.multiplyScalar(0.2)
    scene.add(mesh)
  }, undefined, console.error)

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

    if (mesh) {
      mesh.rotation.x += 0.01
      mesh.rotation.y += 0.02
    }

    renderer.render(scene, camera)
  }
  animate()

  vueInstance.$deinit = () => {
    vueInstance.$isDestroyed = true
    if (mesh) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    renderer.dispose()
  }
}
