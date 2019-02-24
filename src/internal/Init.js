import * as THREE from 'three'
import GLTFLoader from 'three-gltf-loader'
import {Sky} from './Sky'
import {OrbitControls} from './OrbitControls'
// import {trackTest} from './TrackTest'
// import {extrudeTest} from './ExtrudeTest'
// import {moctreeTest} from './moctree/MoctreeTest'
import {lsdfTest} from './lsdf/LsdfTest'

// https://github.com/mrdoob/three.js/issues/14804
function fixCubeCameraLayers (cubeCamera) {
  for (const childCamera of cubeCamera.children) {
    // Assumes all children are actually the 6 cameras.
    childCamera.layers = cubeCamera.layers
  }
  return cubeCamera
}

export function init (vueInstance) {
  const canvas = vueInstance.$refs.canvas

  const width = 1 // vueInstance.$el.clientWidth
  const height = 1 // vueInstance.$el.clientHeight

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 100)
  camera.position.set(0, 1, 1)

  const scene = new THREE.Scene()

  // const gridHelper = new THREE.GridHelper(10, 2, 0xffffff, 0xffffff)
  // scene.add(gridHelper)

  const axesHelper = new THREE.AxesHelper(1) // "The X axis is red. The Y axis is green. The Z axis is blue."
  scene.add(axesHelper)

  const controls = new OrbitControls(camera)

  const sky = new Sky()
  sky.layers.enable(1)
  sky.scale.setScalar(10)
  const skyUniforms = sky.material.uniforms
  // skyUniforms.turbidity.value = 10
  // skyUniforms.rayleigh.value = 2
  // skyUniforms.luminance.value = 1
  // skyUniforms.mieCoefficient.value = 0.005
  // skyUniforms.mieDirectionalG.value = 0.8
  skyUniforms.sunPosition.value.y = 10
  scene.add(sky)

  const envCubeCamera = new THREE.CubeCamera(1, 1000, 256)
  fixCubeCameraLayers(envCubeCamera)
  envCubeCamera.layers.set(1)
  envCubeCamera.renderTarget.texture.generateMipmaps = true
  envCubeCamera.renderTarget.texture.minFilter = THREE.LinearMipMapLinearFilter
  scene.add(envCubeCamera)

  // const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
  // scene.add(directionalLight)

  const cubeTextureLoader = new THREE.CubeTextureLoader()
  cubeTextureLoader.setPath('../statics/textures/env/testenv0/')
  // const envMap = cubeTextureLoader.load([
  //   'red.png', 'cyan.png', // x+ x-
  //   'green.png', 'magenta.png', // y+ y-
  //   'blue.png', 'yellow.png' // z+ z-
  // ])
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.80,
    roughness: 0.20,
    envMap: envCubeCamera.renderTarget.texture
  })
  let mesh
  const gltfLoader = new GLTFLoader()
  gltfLoader.load('../statics/DeltaArrow.glb', (gltf) => {
    mesh = gltf.scene.children[0]
    mesh.material = material
    mesh.scale.multiplyScalar(0.2)
    // scene.add(mesh)
  }, undefined, console.error)
  // trackTest(scene, material)
  // extrudeTest(scene, material)
  // moctreeTest(vueInstance, scene, camera, material)
  lsdfTest(vueInstance, scene, camera, material)

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

    const sunPosTime = new Date().getTime() * 0.00025
    const sunPosTime2 = new Date().getTime() * 0.00015
    const sunPosFactor = 100 * Math.cos(sunPosTime2)
    skyUniforms.sunPosition.value.x = sunPosFactor * Math.cos(sunPosTime)
    skyUniforms.sunPosition.value.z = sunPosFactor * Math.sin(sunPosTime)
    envCubeCamera.update(renderer, scene)
    controls.update()
    // if (mesh) {
    //   mesh.rotation.x += 0.01
    //   mesh.rotation.y += 0.02
    // }

    renderer.render(scene, camera)
  }
  animate()

  vueInstance.$deinit.push(() => {
    vueInstance.$isDestroyed = true
    controls.dispose()
    if (mesh) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    renderer.dispose()
  })
}
