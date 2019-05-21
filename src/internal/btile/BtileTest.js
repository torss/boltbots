/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
// import { BufferSet } from './BufferSet'
import { Dim } from './Dim'
import { TiMa } from './TiMa'
import { TiTy } from './TiTy'
import { TiSh } from './TiSh'
import { TiEn } from './TiEn'

export function btileTest (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  material.vertexColors = THREE.VertexColors
  material.roughness = 0.8
  material.metalness = 0.2
  material.envMapIntensity = 10

  const material2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.90,
    roughness: 0.20,
    envMap: material.envMap,
    envMapIntensity: 1,
    vertexColors: THREE.VertexColors
  })

  // const light = new THREE.PointLight(0xffffff, 1, 100)
  // light.shadow.camera.near = 0.1 // default 0.5
  // light.shadow.camera.far = 500 // default
  // light.position.set(-5, 3, -5)
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(-5, 2, -5)
  light.castShadow = true // default false
  light.shadow.mapSize.width = 2048 // default 512
  light.shadow.mapSize.height = 2048 // default 512
  light.shadow.camera.top = 15
  light.shadow.camera.left = -15
  light.shadow.camera.right = 15
  scene.add(light)
  // const helper = new THREE.CameraHelper(light.shadow.camera)
  // scene.add(helper)

  const gltfLoader = new GLTFLoader()

  const tiTys = {}
  const tiTysList = []
  const tilePaths = [
    'Cube',
    'CubeQuarter',
    'Wall0',
    'Wall1',
    'Floor0',
    'ConveyorSingle0',
    'ConveyorDouble0',
    'ControlTower0'
  ]
  const dim = new Dim(16)

  for (const tilePath of tilePaths) {
    gltfLoader.load('../statics/models/tiles/' + tilePath + '.glb', (gltf) => {
      tiTys[tilePath] = new TiTy(new TiSh(gltf.scene))
      tiTysList.push(tiTys[tilePath])
    })
  }

  gltfLoader.load('../statics/models/vehicle/TestTank.glb', (gltf) => {
    gltf.scene.traverseVisible(obj => {
      if (obj.isMesh) {
        obj.material = material
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
    gltf.scene.lookAt(new THREE.Vector3(0, 0, -1))
    gltf.scene.position.y = 1
    gltf.scene.position.x = dim.x / 2
    gltf.scene.position.z = dim.z / 2
    scene.add(gltf.scene)
  })

  THREE.DefaultLoadingManager.onLoad = () => {
    tiTys['Ground'] = new TiTy(tiTys['Cube'].tiSh)
    tiTys['Ground'].color = new THREE.Vector4(173 / 255, 131 / 255, 83 / 255, 1)
    tiTys['Pavement'] = new TiTy(tiTys['Floor0'].tiSh)
    // tiTys['Pavement'].color = new THREE.Vector4(196 / 255, 196 / 255, 196 / 255, 1)
    tiTys['Pavement'].color = new THREE.Vector4(1, 1, 1, 1)

    // const tiMa = new TiMa(new Dim(Math.ceil(Math.sqrt(tilePaths.length)), undefined, 1))
    // tiMa.materials.default = material
    // tiMa.dim.iterate((pos, i) => {
    //   const tiTy = tiTysList[i]
    //   if (!tiTy) return
    //   tiMa.tiEns[i] = new TiEn(tiTy)
    // })

    const tiMa = new TiMa(dim)
    tiMa.materials.default = material2 // material
    const tiTyByZ = [
      'Ground',
      'Pavement'
    ]
    tiMa.dim.iterate((pos, i) => {
      // let tiTyKey = tiTyByZ[pos.y > pos.x ? pos.y - pos.x : 0]
      let tiTyKey = tiTyByZ[pos.y]
      if (!tiTyKey) return
      if (tiTyKey === 'Pavement') {
        if (pos.x === 0 || pos.z === 0 || pos.x === dim.x - 1 || pos.z === dim.z - 1) {
          // tiTyKey = pos.x !== pos.z ? 'Wall1' : 'Wall0'
          tiTyKey = 'Wall1'
        } else if (pos.z === 4) {
          tiTyKey = 'ConveyorSingle0'
        } else if (pos.z === 5) {
          tiTyKey = 'ConveyorDouble0'
        } else if (pos.x === 3 && pos.z === 3) { // (pos.x === Math.floor(dim.x / 2) && pos.z === 9) {
          tiTyKey = 'ControlTower0'
        }
      }
      const tiTy = tiTys[tiTyKey]
      const tiEn = new TiEn(tiTy)
      tiMa.tiEns[i] = tiEn
      if (tiTyKey === 'ConveyorSingle0') {
        tiEn.rotation = ['X+', 'X-', 'Z+', 'Z-'][Math.floor(Math.random() * 4)]
      }
    })

    for (const mesh of Object.values(tiMa.remesh())) {
      mesh.castShadow = true
      mesh.receiveShadow = true
      scene.add(mesh)
    }
  }
}

export function btileTestOld (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.20,
    roughness: 0.80,
    envMap: material.envMap
  })
  const gltfLoader = new GLTFLoader()
  gltfLoader.load('../statics/models/TestCube(flawed-pos).glb', (gltf) => {
    // // window.scene = gltf.scene
    const copyDim = 3

    const tiTy = new TiTy(new TiSh(gltf.scene))
    const tiMa = new TiMa(new Dim(copyDim, undefined, 4))
    tiMa.materials.default = material
    material.vertexColors = THREE.VertexColors
    tiMa.dim.iterate((pos, i) => {
      if (pos.y > pos.x) return
      tiMa.tiEns[i] = new TiEn(tiTy)
    })
    for (const mesh of Object.values(tiMa.remesh())) {
      scene.add(mesh)
    }

    // // // Shared BufferSet(s) variant:
    // const bufferSets = {}
    // const getBufferSet = materialKey => (bufferSets[materialKey] = bufferSets[materialKey] || new BufferSet())
    // console.time('btile-bufferSet-copyDim-' + copyDim)
    // // gltf.scene.updateMatrixWorld()
    // gltf.scene.traverseVisible(obj => {
    //   if (obj.isMesh) {
    //     const bufferSet = getBufferSet(obj.name.endsWith('label') ? 'material' : 'material2')
    //     const geometry = obj.geometry
    //     // geometry.applyMatrix(obj.matrixWorld)

    //     const copyAppendMod = (attrKey, mod = undefined) => {
    //       const frBuf = geometry.getAttribute(attrKey)
    //       const toBuf = bufferSet[attrKey]
    //       toBuf.padSize(toBuf.countCurrent + frBuf.count)
    //       if (mod) {
    //         if (frBuf.itemSize === 3) {
    //           for (let i = 0; i < frBuf.array.length; i += 3) {
    //             toBuf.upushVector3(mod(new THREE.Vector3(frBuf.array[i + 0], frBuf.array[i + 1], frBuf.array[i + 2])))
    //           }
    //         } else {
    //           console.error('copyAppendMod not implemented for frBuf.itemSize === ' + frBuf.itemSize)
    //         }
    //       } else {
    //         for (let i = 0; i < frBuf.array.length; ++i) {
    //           toBuf.array[toBuf.indexCurrent++] = frBuf.array[i]
    //         }
    //       }
    //     }
    //     for (let x = 0; x < copyDim; ++x) {
    //       for (let y = 0; y < copyDim; ++y) {
    //         const posAdd = new THREE.Vector3(x, 0, y)
    //         copyAppendMod('position', pos => pos.add(posAdd))
    //         copyAppendMod('normal')

    //         const vertexCount = geometry.getAttribute('position').count
    //         bufferSet.color.padSize(bufferSet.color.countCurrent + vertexCount)
    //         for (let i = 0; i < vertexCount; ++i) bufferSet.color.upushVector3(new THREE.Vector3(1, 0, 0))

    //         bufferSet.index.pushRelative(...geometry.index.array)
    //       }
    //     }
    //   }
    // })
    // console.timeEnd('btile-bufferSet-copyDim-' + copyDim)

    // for (const [materialKey, bufferSet] of Object.entries(bufferSets)) {
    //   const materialSel = materialKey === 'material' ? material : material2
    //   scene.add(new THREE.Mesh(bufferSet.fitSize().createGeometry(), materialSel))
    // }
    // // window.bufferSet = bufferSet
    // // window.geometry = geometry

    // // Naive aka draw-call-heavy variant:
    gltf.scene.traverseVisible(obj => {
      if (obj.isMesh) obj.material = obj.name.endsWith('label') ? material : material2
    })
    for (let x = 0; x < copyDim; ++x) {
      for (let y = 0; y < copyDim; ++y) {
        const clone = gltf.scene.clone()
        clone.position.x -= (x + 2)
        clone.position.z -= (y + 2)
        scene.add(clone)
      }
    }
  }, undefined, console.error)
}
