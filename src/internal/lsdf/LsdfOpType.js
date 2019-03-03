import * as THREE from 'three'
import '../extensions/three/Vector3'
import '../extensions/Math'

// See https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
function sdSphere (position, radius) { return position.length() - radius }
function sdBox (position, size) {
  const d = position.clone().abs().sub(size)
  return Math.min(Math.max(d.x, Math.max(d.y, d.z)), 0) + d.max(new THREE.Vector3()).length()
}

function opUnion (d1, d2) { return Math.min(d1, d2) }
function opSubtraction (d1, d2) { return Math.max(-d1, d2) }
function opIntersection (d1, d2) { return Math.max(d1, d2) }

function opSmoothUnion (d1, d2, k) {
  const h = Math.clamp(0.5 + 0.5 * (d2 - d1) / k, 0, 1)
  return Math.lerp(d2, d1, h) - k * h * (1 - h)
}
function opSmoothSubtraction (d1, d2, k) {
  const h = Math.clamp(0.5 - 0.5 * (d2 + d1) / k, 0, 1)
  return Math.lerp(d2, -d1, h) + k * h * (1 - h)
}
function opSmoothIntersection (d1, d2, k) {
  const h = Math.clamp(0.5 - 0.5 * (d2 - d1) / k, 0, 1)
  return Math.lerp(d2, d1, h) + k * h * (1 - h)
}

class LsdfOpType {
  constructor (key, funcName, func, typeMapSize) {
    this.key = key
    this.funcName = funcName // LSDF approach2
    this.func = func // LSDF approach4
    this.opCode = -1 // LSDF approach3
    this.typeMapSize = typeMapSize // LSDF approach2 (maybe approach3 too?)
  }
}

class LsdfOpTypeCombine extends LsdfOpType {
  constructor (key, funcName, func, ordered = false, typeMapSize = 0) {
    super(key, funcName, func, typeMapSize)
    this.ordered = ordered
  }
  get kind () { return 'combine' }
}

class LsdfOpTypeShape extends LsdfOpType {
  get kind () { return 'shape' }
}

export const lsdfOpTypeCombines = [
  new LsdfOpTypeCombine('union', 'opUnion', opUnion, false),
  new LsdfOpTypeCombine('subtract', 'opSubtraction', opSubtraction, true),
  new LsdfOpTypeCombine('intersect', 'opIntersection', opIntersection, false),
  new LsdfOpTypeCombine('unionSmooth', 'opSmoothUnion', opSmoothUnion, false, 1),
  new LsdfOpTypeCombine('subtractSmooth', 'opSmoothSubtraction', opSmoothSubtraction, true, 1),
  new LsdfOpTypeCombine('intersectSmooth', 'opSmoothIntersection', opSmoothIntersection, false, 1)
]
export const lsdfOpTypeShapes = [
  new LsdfOpTypeShape('sphere', 'sdSphere', sdSphere, 1),
  new LsdfOpTypeShape('box', 'sdBox', sdBox, 2)
]
lsdfOpTypeCombines.forEach((lsdfOpType, index) => { lsdfOpType.opCode = index + 3 })
lsdfOpTypeShapes.forEach((lsdfOpType, index) => { lsdfOpType.opCode = index + 1 })
export const lsdfOpTypes = [
  ...lsdfOpTypeCombines,
  ...lsdfOpTypeShapes
].reduce((obj, opType) => {
  obj[opType.key] = opType
  return obj
}, {})

export function initTestLsdfConfigs (count) {
  const randomA = () => 0.2 + Math.random() * 0.3 // 0.4
  const randomB = () => 0.2 + Math.random() * 0.2 // 0.3
  const randomC = () => 0.1 + Math.random() * 0.2
  const randomD = () => Math.random() * 0.2 - 0.1
  const genRandomSphere = (position) => ({type: 'sphere', position, radius: randomA()})
  const genRandomBox = (position) => ({type: 'box', position, size: new THREE.Vector3(randomB(), randomB(), randomB())})
  const genRandomSomething = (what, position) => what ? genRandomSphere(position) : genRandomBox(position)
  const combineBase = (type, x, y) => {
    const opType = lsdfOpTypes[type]
    if (!opType.ordered) {
      // Order independent, so re-order x, y by type string order if necessary
      if (x.type > y.type) {
        const z = x; x = y; y = z
      }
    }
    const result = {type, x, y}
    if (opType.typeMapSize === 1) result.radius = randomC()
    return result
  }
  const combineRandom = (what, x, y) => combineBase(lsdfOpTypeCombines[what].key, x, y)
  const lsdfConfigs = []
  for (let i = 0; i < count; ++i) {
    const position = new THREE.Vector3(i, 0, 0)
    const what = Math.random() > 0.5
    let combine = combineRandom(
      i % lsdfOpTypeCombines.length, // Math.random() > 0.66, // i % 2 === 0,
      genRandomSomething(what, position),
      genRandomSomething(!what, position)
    )
    for (let i = 0; i < 2; ++i) {
      combine = combineRandom(
        Math.floor(Math.random() * lsdfOpTypeCombines.length), // i === 0 ? Math.floor(Math.random() * lsdfOpTypeCombines.length) : lsdfOpTypeCombines.indexOf(lsdfOpTypes['intersectSmooth']),
        combine,
        genRandomSomething(i === 0 ? Math.random() > 0.5 : false, i === 0 ? position : new THREE.Vector3(0, randomD(), randomD()).add(position))
      )
    }
    lsdfConfigs.push(combine)
  }
  return lsdfConfigs
}
