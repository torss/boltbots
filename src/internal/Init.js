import * as THREE from 'three'
import GLTFLoader from 'three-gltf-loader'
import {Sky} from './Sky'
import {OrbitControls} from './OrbitControls'
import Stats from 'stats.js'
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

// export function init (vueInstance) {
//   // FIXME
//   // var container, stats

//   var cameraRTT, camera, sceneRTT, sceneScreen, scene, renderer, zmesh1, zmesh2

//   var mouseX = 0, mouseY = 0

//   var windowHalfX = window.innerWidth / 2
//   var windowHalfY = window.innerHeight / 2

//   var rtTexture, material, quad

//   var delta = 0.01

//   init()
//   animate()

//   function init () {
//     const canvas = vueInstance.$refs.canvas

//     camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 10000)
//     camera.position.z = 100

//     cameraRTT = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerWidth / 2, window.innerHeight / 2, window.innerHeight / -2, -10000, 10000)
//     cameraRTT.position.z = 100

//     //

//     scene = new THREE.Scene()
//     sceneRTT = new THREE.Scene()
//     sceneScreen = new THREE.Scene()

//     var light = new THREE.DirectionalLight(0xffffff)
//     light.position.set(0, 0, 1).normalize()
//     sceneRTT.add(light)

//     light = new THREE.DirectionalLight(0xffaaaa, 1.5)
//     light.position.set(0, 0, -1).normalize()
//     sceneRTT.add(light)

//     // rtTexture = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );

//     rtTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
//       wrapS: THREE.ClampToEdgeWrapping,
//       wrapT: THREE.ClampToEdgeWrapping,
//       minFilter: THREE.NearestFilter,
//       magFilter: THREE.NearestFilter,
//       format: THREE.RGBAFormat,
//       type: THREE.FloatType,
//       stencilBuffer: false,
//       depthBuffer: false
//     })

//     const vertexShader = `
//       varying vec2 vUv;

//       void main() {

//         vUv = uv;
//         gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

//       }`
//     const fragmentShaderPass1 = `
//       varying vec2 vUv;
//       uniform float time;

//       void main() {

//         float r = vUv.x;
//         if( vUv.y < 0.5 ) r = 0.0;
//         float g = vUv.y;
//         if( vUv.x < 0.5 ) g = 0.0;

//         gl_FragColor = vec4( r, g, time, 1.0 );

//       }`
//     const fragmentShaderScreen = `
//       varying vec2 vUv;
//       uniform sampler2D tDiffuse;

//       void main() {

//         gl_FragColor = texture2D( tDiffuse, vUv );

//       }`

//     material = new THREE.ShaderMaterial({

//       uniforms: { time: { value: 0.0 } },
//       vertexShader: vertexShader,
//       fragmentShader: fragmentShaderPass1

//     })

//     var materialScreen = new THREE.ShaderMaterial({

//       uniforms: { tDiffuse: { value: rtTexture.texture } },
//       vertexShader: vertexShader,
//       fragmentShader: fragmentShaderScreen,

//       depthWrite: false

//     })

//     var plane = new THREE.PlaneBufferGeometry(window.innerWidth, window.innerHeight)

//     quad = new THREE.Mesh(plane, material)
//     quad.position.z = -100
//     sceneRTT.add(quad)

//     var geometry = new THREE.TorusBufferGeometry(100, 25, 15, 30)

//     var mat1 = new THREE.MeshPhongMaterial({ color: 0x555555, specular: 0xffaa00, shininess: 5 })
//     var mat2 = new THREE.MeshPhongMaterial({ color: 0x550000, specular: 0xff2200, shininess: 5 })

//     zmesh1 = new THREE.Mesh(geometry, mat1)
//     zmesh1.position.set(0, 0, 100)
//     zmesh1.scale.set(1.5, 1.5, 1.5)
//     sceneRTT.add(zmesh1)

//     zmesh2 = new THREE.Mesh(geometry, mat2)
//     zmesh2.position.set(0, 150, 100)
//     zmesh2.scale.set(0.75, 0.75, 0.75)
//     sceneRTT.add(zmesh2)

//     quad = new THREE.Mesh(plane, materialScreen)
//     quad.position.z = -100
//     sceneScreen.add(quad)

//     var n = 5
//     geometry = new THREE.SphereBufferGeometry(10, 64, 32)
//     const material2 = new THREE.MeshBasicMaterial({ color: 0xffffff, map: rtTexture.texture })

//     for (var j = 0; j < n; j++) {
//       for (var i = 0; i < n; i++) {
//         var mesh = new THREE.Mesh(geometry, material2)

//         mesh.position.x = (i - (n - 1) / 2) * 20
//         mesh.position.y = (j - (n - 1) / 2) * 20
//         mesh.position.z = 0

//         mesh.rotation.y = -Math.PI / 2

//         scene.add(mesh)
//       }
//     }

//     renderer = new THREE.WebGLRenderer({canvas, context: canvas.getContext('webgl2')})
//     renderer.extensions.get('EXT_color_buffer_float')
//     renderer.setPixelRatio(window.devicePixelRatio)
//     renderer.setSize(window.innerWidth, window.innerHeight)
//     renderer.autoClear = false

//     // container.appendChild(renderer.domElement)

//     // stats = new Stats()
//     // container.appendChild(stats.dom)

//     document.addEventListener('mousemove', onDocumentMouseMove, false)
//   }

//   function onDocumentMouseMove (event) {
//     mouseX = (event.clientX - windowHalfX)
//     mouseY = (event.clientY - windowHalfY)
//   }

//   //

//   function animate () {
//     requestAnimationFrame(animate)

//     render()
//     // stats.update()
//   }

//   function render () {
//     var time = Date.now() * 0.0015

//     camera.position.x += (mouseX - camera.position.x) * 0.05
//     camera.position.y += (-mouseY - camera.position.y) * 0.05

//     camera.lookAt(scene.position)

//     if (zmesh1 && zmesh2) {
//       zmesh1.rotation.y = -time
//       zmesh2.rotation.y = -time + Math.PI / 2
//     }

//     if (material.uniforms[ 'time' ].value > 1 || material.uniforms[ 'time' ].value < 0) {
//       delta *= -1
//     }

//     material.uniforms[ 'time' ].value += delta

//     // Render first scene into texture

//     renderer.setRenderTarget(rtTexture)
//     renderer.clear()
//     renderer.render(sceneRTT, cameraRTT)

//     // Render full screen quad with generated texture

//     renderer.setRenderTarget(null)
//     renderer.clear()
//     // renderer.render( sceneScreen, cameraRTT );

//     // Render second scene to screen
//     // (using first scene as regular texture)

//     renderer.render(scene, camera)
//   }

//   vueInstance.$resize = ({width, height}) => {
//     camera.aspect = width / height
//     camera.updateProjectionMatrix()
//     renderer.setSize(width, height)
//   }
// }

export function init (vueInstance) {
  window.qwe = undefined // FIXME
  const canvas = vueInstance.$refs.canvas

  const width = 1 // vueInstance.$el.clientWidth
  const height = 1 // vueInstance.$el.clientHeight

  const camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 100)
  camera.position.set(0, 1, 1)

  let scene = new THREE.Scene()

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

  // scene = new THREE.Scene() // FIXME

  const context = canvas.getContext('webgl2')
  const renderer = new THREE.WebGLRenderer({canvas, context, antialias: true})
  renderer.autoClear = false
  renderer.setSize(width, height)

  lsdfTest(vueInstance, scene, camera, material, renderer)

  vueInstance.$resize = ({width, height}) => {
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
  }

  vueInstance.$isDestroyed = false
  const stats = new Stats()
  stats.dom.style.cssText = ''
  const toolbarStatsParent = vueInstance.$parent.$parent.$parent.$refs.toolbarStats
  toolbarStatsParent.appendChild(stats.dom)
  function animate () {
    if (vueInstance.$isDestroyed) return

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

    /* eslint-disable no-unused-vars */
    const currentRenderTarget = renderer.getRenderTarget()
    // if (window.qwe) window.qwe.compute(false, scene, camera) // FIXME
    if (window.rttTestRend) window.rttTestRend() // FIXME
    renderer.setRenderTarget(currentRenderTarget)
    renderer.setClearColor(new THREE.Color(1, 1, 1), 1)
    renderer.clear()
    renderer.render(scene, camera)

    stats.update()

    requestAnimationFrame(animate)
  }
  animate()

  vueInstance.$deinit.push(() => {
    vueInstance.$isDestroyed = true
    toolbarStatsParent.removeChild(stats.dom)
    controls.dispose()
    if (mesh) {
      mesh.geometry.dispose()
      mesh.material.dispose()
    }
    renderer.dispose()
  })
}
