import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { Sky } from './Sky'
import { OrbitControls } from './OrbitControls'
import { glos } from './Glos'
import Stats from 'stats.js'
import { RenderPass, UnrealBloomPass, EffectComposer, ShaderPass } from './postprocessing'
import { BloomFinalShader } from './shaders'
// import {trackTest} from './TrackTest'
// import {extrudeTest} from './ExtrudeTest'
// import {moctreeTest} from './moctree/MoctreeTest'
// import {lsdfTest} from './lsdf/LsdfTest'
// import {conscepterTest} from './conscepter/ConscepterTest'
// import { tvoxelTest } from './tvoxel/TvoxelTest'
// import { btileTest } from './btile/BtileTest'

// https://github.com/mrdoob/three.js/issues/14804
function fixCubeCameraLayers (cubeCamera) {
  for (const childCamera of cubeCamera.children) {
    // Assumes all children are actually the 6 cameras.
    childCamera.layers = cubeCamera.layers
  }
  return cubeCamera
}

export function init (vueInstance) {
  const renderingEnabled = true
  const canvas = vueInstance.$refs.canvas

  const width = 1 // vueInstance.$el.clientWidth
  const height = 1 // vueInstance.$el.clientHeight

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 1000)
  camera.position.set(12, 4, 12)
  // camera.up.set(0, 0, 1) // Z up

  const audioListener = new THREE.AudioListener()
  camera.add(audioListener)

  const scene = new THREE.Scene()

  // const gridHelper = new THREE.GridHelper(10, 2, 0xffffff, 0xffffff)
  // scene.add(gridHelper)

  // const axesHelper = new THREE.AxesHelper(1) // "The X axis is red. The Y axis is green. The Z axis is blue."
  // scene.add(axesHelper)

  const controls = new OrbitControls(camera)
  controls.maxDistance = 100
  controls.minDistance = 14
  controls.maxPolarAngle = 0.4 * Math.PI
  controls.enableKeys = false
  controls.enablePan = false
  controls.target.set(8, 0, 8)
  glos.threejsControls = controls

  const sky = new Sky()
  sky.layers.enable(1)
  sky.scale.setScalar(990)
  const skyUniforms = sky.material.uniforms
  glos.skyUniforms = skyUniforms
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

  const context = canvas.getContext('webgl2')
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true })
  renderer.autoClear = false
  renderer.shadowMap.enabled = true
  renderer.setSize(width, height)

  // Post-Processing (EffectComposer) setup //
  // renderer.toneMapping = THREE.ReinhardToneMapping
  renderer.toneMappingExposure = Math.pow(1.1, 4.0)

  const scenePass = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 10.0, 0.0, 0.0)

  const composerBloom = new EffectComposer(renderer)
  composerBloom.renderToScreen = false
  composerBloom.addPass(scenePass)
  composerBloom.addPass(bloomPass)

  const finalPass = new ShaderPass(
    new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        bloomTexture: { value: composerBloom.renderTarget2.texture }
      },
      vertexShader: BloomFinalShader.vertexShader,
      fragmentShader: BloomFinalShader.fragmentShader
    }), 'baseTexture'
  )
  finalPass.needsSwap = true

  const composerFinal = new EffectComposer(renderer)
  composerFinal.addPass(scenePass)
  composerFinal.addPass(finalPass)

  const darkMaterial = new THREE.MeshBasicMaterial({ color: 'black' })
  // - //

  const preAnimateFuncs = glos.preAnimateFuncs

  // lsdfTest(vueInstance, scene, camera, material, renderer, preAnimateFuncs)
  // conscepterTest(vueInstance, scene, camera, material, renderer, preAnimateFuncs)
  // tvoxelTest(vueInstance, scene, camera, material, renderer, preAnimateFuncs)
  // btileTest(vueInstance, scene, camera, material, renderer, preAnimateFuncs)

  vueInstance.$onResize.push(({ width, height }) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
    composerBloom.setSize(width, height)
    composerFinal.setSize(width, height)
  })

  // TODO ? vueInstance.$deinit

  vueInstance.$isDestroyed = false
  const stats = new Stats()
  stats.dom.style.cssText = ''
  const toolbarStatsParent = vueInstance.$parent.$parent.$parent.$refs.toolbarStats
  toolbarStatsParent.appendChild(stats.dom)
  function animate () {
    if (vueInstance.$isDestroyed) return

    requestAnimationFrame(animate)

    TWEEN.update()

    for (const func of preAnimateFuncs) func()

    const sunPosTime = new Date().getTime() * 0.000025
    const sunPosTime2 = new Date().getTime() * 0.000015
    const sunPosFactor = 100 * Math.cos(sunPosTime2)
    skyUniforms.sunPosition.value.x = sunPosFactor * Math.cos(sunPosTime)
    skyUniforms.sunPosition.value.z = sunPosFactor * Math.sin(sunPosTime)
    if (controls) controls.update()
    // if (mesh) {
    //   mesh.rotation.x += 0.01
    //   mesh.rotation.y += 0.02
    // }

    if (renderingEnabled) {
      envCubeCamera.update(renderer, scene)
      // renderer.clear()
      // renderer.render(scene, camera)

      scene.traverseVisible(obj => {
        if (obj.isMesh) {
          if (!obj.bloom) {
            obj.tmp = obj.material
            obj.material = darkMaterial
          }
        } else {
          obj.tmp = false
        }
      })
      sky.visible = false
      composerBloom.render()
      sky.visible = true
      scene.traverseVisible(obj => {
        if (obj.tmp) obj.material = obj.tmp
      })
      composerFinal.render()
    }

    stats.update()
  }
  animate()

  vueInstance.$deinit.push(() => {
    vueInstance.$isDestroyed = true
    toolbarStatsParent.removeChild(stats.dom)
    if (controls) controls.dispose()
    if (mesh) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    renderer.dispose()
  })

  return {
    scene,
    material,
    audioListener
  }
}
