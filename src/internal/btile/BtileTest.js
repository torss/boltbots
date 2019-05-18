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
  const gltfLoader = new GLTFLoader()

  const tiTys = {}
  const tiTysList = []
  const tilePaths = [
    'Cube',
    'CubeQuarter'
  ]

  for (const tilePath of tilePaths) {
    gltfLoader.load('../statics/models/tiles/' + tilePath + '.glb', (gltf) => {
      tiTys[tilePath] = new TiTy(new TiSh(gltf.scene))
      tiTysList.push(tiTys[tilePath])
    })
  }

  THREE.DefaultLoadingManager.onLoad = () => {
    // const tiMa = new TiMa(new Dim(Math.ceil(Math.sqrt(tilePaths.length)), undefined, 1))
    // tiMa.materials.default = material
    // tiMa.dim.iterate((pos, i) => {
    //   const tiTy = tiTysList[i]
    //   if (!tiTy) return
    //   tiMa.tiEns[i] = new TiEn(tiTy)
    // })

    const tiMa = new TiMa(new Dim(16))
    tiMa.materials.default = material
    const tiTyByZ = [
      tiTys['Cube'],
      tiTys['CubeQuarter']
    ]
    tiMa.dim.iterate((pos, i) => {
      const tiTy = tiTyByZ[pos.y > pos.x ? pos.y - pos.x : 0]
      if (!tiTy) return
      tiMa.tiEns[i] = new TiEn(tiTy)
    })

    for (const mesh of Object.values(tiMa.remesh())) {
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
