import * as THREE from 'three'
import GLTFLoader from 'three-gltf-loader'

export function init (vueInstance) {
  const canvas = vueInstance.$refs.canvas

  const width = 1 // vueInstance.$el.clientWidth
  const height = 1 // vueInstance.$el.clientHeight

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10)
  camera.position.z = 1

  const scene = new THREE.Scene()

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
  scene.add(directionalLight)

  const cubeTextureLoader = new THREE.CubeTextureLoader()
  cubeTextureLoader.setPath('../statics/textures/env/testenv0/')
  const envMap = cubeTextureLoader.load([
    'red.png', 'cyan.png', // x+ x-
    'green.png', 'magenta.png', // y+ y-
    'blue.png', 'yellow.png' // z+ z-
  ])
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.80,
    roughness: 0.20,
    envMap
  })
  let mesh
  const gltfLoader = new GLTFLoader()
  gltfLoader.load('../statics/DeltaArrow.glb', (gltf) => {
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
