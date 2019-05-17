/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { BufferSet } from './BufferSet'

export function btileTest (vueInstance, scene, camera, material, renderer, preAnimateFuncs) {
  const material2 = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.20,
    roughness: 0.80,
    envMap: material.envMap
  })
  const gltfLoader = new GLTFLoader()
  gltfLoader.load('../statics/models/TestCube.glb', (gltf) => {
    // window.scene = gltf.scene

    let geometry
    gltf.scene.traverseVisible(obj => {
      if (obj.isMesh) obj.material = obj.name.endsWith('label') ? material : material2
      if (obj.isMesh) geometry = obj.geometry
    })

    const copyDim = 128

    console.time('btile-bufferSet-copyDim-' + copyDim)
    const bufferSet = new BufferSet()
    const copyAppendMod = (attrKey, mod = undefined) => {
      const frBuf = geometry.getAttribute(attrKey)
      const toBuf = bufferSet[attrKey]
      toBuf.padSize(toBuf.countCurrent + frBuf.count)
      if (mod) {
        if (frBuf.itemSize === 3) {
          for (let i = 0; i < frBuf.array.length; i += 3) {
            toBuf.upushVector3(mod(new THREE.Vector3(frBuf.array[i + 0], frBuf.array[i + 1], frBuf.array[i + 2])))
          }
        } else {
          console.error('copyAppendMod not implemented for frBuf.itemSize === ' + frBuf.itemSize)
        }
      } else {
        for (let i = 0; i < frBuf.array.length; ++i) {
          toBuf.array[toBuf.indexCurrent++] = frBuf.array[i]
        }
      }
    }
    for (let x = 0; x < copyDim; ++x) {
      for (let y = 0; y < copyDim; ++y) {
        const posAdd = new THREE.Vector3(x * 2, 0, y * 2)
        copyAppendMod('position', pos => pos.add(posAdd))
        copyAppendMod('normal')

        const vertexCount = geometry.getAttribute('position').count
        bufferSet.color.padSize(bufferSet.color.countCurrent + vertexCount)
        for (let i = 0; i < vertexCount; ++i) bufferSet.color.upushVector3(new THREE.Vector3(1, 0, 0))

        bufferSet.index.pushRelative(...geometry.index.array)
        // const indexTo = bufferSet.index
        // const indexFr = geometry.index
        // const hsi = indexTo.highestStoredIndex + 1
        // for (let i = 0; i < indexFr.array.length; ++i) {
        //   indexTo.pushWithOffset(hsi, indexFr.array[i])
        // }
      }
    }
    console.timeEnd('btile-bufferSet-copyDim-' + copyDim)

    scene.add(new THREE.Mesh(bufferSet.fitSize().createGeometry(), material))
    // window.bufferSet = bufferSet
    // window.geometry = geometry

    // Naive aka draw-call-heavy variant:
    // for (let x = 0; x < copyDim; ++x) {
    //   for (let y = 0; y < copyDim; ++y) {
    //     const clone = gltf.scene.clone()
    //     clone.position.x += x * 2
    //     clone.position.z += y * 2
    //     scene.add(clone)
    //   }
    // }
  }, undefined, console.error)
}
