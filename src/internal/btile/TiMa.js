import * as THREE from 'three'
import { BufferSet } from './BufferSet'
import { oppositeSideNames } from './Sides'

const defaultMaterial = new THREE.MeshBasicMaterial({
  vertexColors: THREE.VertexColors
})

/**
 * Tile Map
 */
export class TiMa {
  constructor (dim) {
    this.dim = dim
    this.tiEns = []
    for (let i = 0; i < dim.cu; ++i) this.tiEns.push(undefined)
    this.bufferSets = {}
    this.materials = {
      default: defaultMaterial
    }
  }

  getBufferSet (materialKey, createIfNotFound = true) {
    const bufferSets = this.bufferSets
    return createIfNotFound ? (bufferSets[materialKey] = bufferSets[materialKey] || new BufferSet()) : bufferSets[materialKey]
  }

  remesh () {
    const { dim, tiEns, bufferSets } = this
    for (const bufferSet of Object.values(bufferSets)) {
      bufferSet.clear()
    }
    dim.iterate((pos, i, iterSides) => {
      const tiEn = tiEns[i]
      if (!tiEn) return
      const tiSh = tiEn.tiTy.tiSh
      tiSh.sides.iterate((sideName, side) => {
        const iterSide = iterSides[sideName]
        const occluded = iterSide.valid && tiEns[iterSide.i] && !tiEns[iterSide.i].tiTy.tiSh.sides[oppositeSideNames[sideName]].partial
        for (const shape of side.shapes) {
          if (occluded && !shape.always) continue
          const frGeometry = shape.geometry
          const toBufferSet = this.getBufferSet(shape.materialKey)
          appendGeom(toBufferSet, pos, frGeometry)
        }
      })
    })
    const meshes = {}
    for (const [materialKey, bufferSet] of Object.entries(bufferSets)) {
      const material = this.materials[materialKey]
      meshes[materialKey] = new THREE.Mesh(bufferSet.fitSize().createGeometry(), material)
    }
    return meshes
  }
}

function appendGeom (toBufferSet, posAdd, frGeometry) {
  copyAppendMod(frGeometry, toBufferSet, 'position', pos => pos.add(posAdd))
  copyAppendMod(frGeometry, toBufferSet, 'normal')
  copyAppendMod(frGeometry, toBufferSet, 'color')
  // const vertexCount = frGeometry.getAttribute('position').count
  // toBufferSet.color.padSize(toBufferSet.color.countCurrent + vertexCount)
  // for (let i = 0; i < vertexCount; ++i) toBufferSet.color.upushVector3(new THREE.Vector3(1, 0, 0))
  toBufferSet.index.pushRelative(...frGeometry.index.array)
}

function copyAppendMod (frGeometry, toBufferSet, attrKey, mod = undefined) {
  const frBuf = frGeometry.getAttribute(attrKey)
  const toBuf = toBufferSet[attrKey]
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
