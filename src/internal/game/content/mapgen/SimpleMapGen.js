import * as THREE from 'three'
import { Map } from '../../Map'
import { MapGen } from '../../MapGen'
import { Dim, TiMa, TiEn } from '../../../btile'

export const mapGenList = []

mapGenList.push(MapGen.createV0('TestGen0', (game) => {
  const { tiTys } = game

  const dim = new Dim(16)
  const tiMa = new TiMa(dim)
  const map = new Map(tiMa)

  const groundHeight = 2
  const outerWallHeight = 2

  new THREE.Vector3(dim.x, groundHeight, dim.z).iterXyz(pos => {
    let i = dim.resolve(pos)
    tiMa.tiEns[i] = new TiEn(tiTys['Ground'])
  })

  new THREE.Vector3(dim.x, outerWallHeight, dim.z).iterXyz(pos => {
    let i = dim.resolve(new THREE.Vector3(0, groundHeight, 0).add(pos))
    if (pos.x === 0 || pos.z === 0 || pos.x === dim.x - 1 || pos.z === dim.z - 1) {
      let tiTyKey = 'Wall1'
      if ((pos.x === 0 && pos.z === 0) || (pos.y < outerWallHeight - 1 && ((pos.x + pos.z) % 3 !== 0))) {
        tiTyKey = 'Wall0'
      }
      tiMa.tiEns[i] = new TiEn(tiTys[tiTyKey])
    }
  })

  new THREE.Vector3(dim.x, 1, dim.z).iterXyz(pos => {
    let i = dim.resolve(new THREE.Vector3(0, groundHeight, 0).add(pos))
    if (!(pos.x === 0 || pos.z === 0 || pos.x === dim.x - 1 || pos.z === dim.z - 1)) {
      tiMa.tiEns[i] = new TiEn(tiTys['Pavement'])
    }
  })

  const controlTowerTilePosition = new THREE.Vector3(0, groundHeight + outerWallHeight, 0)
  tiMa.tiEns[dim.resolve(controlTowerTilePosition)] = new TiEn(tiTys['ControlTower0'])

  generateContent(game, map, groundHeight)

  return {
    map,
    controlTowerTilePosition
  }
}))

function generateContent (game, map, groundHeight) {
  const { tiTys, match } = game
  const rng = match.rngMapGen
  const tiMa = map.tiMa
  const { dim, tiEns } = tiMa
  const choose = (size) => Math.floor(rng.nextNumber() * size)
  const chooseFrom = (options) => options[choose(options.length)]
  const genPos = () => new THREE.Vector3(1 + choose(dim.x - 2), groundHeight, 1 + choose(dim.z - 2))

  const tiTyOptions = ['ConveyorSingle0', 'ConveyorDouble0', 'Wall0']
  const rotationOptions = ['X+', 'X-', 'Z+', 'Z-']
  const rotationToDirection = {
    'X+': new THREE.Vector3(+1, 0, 0), 'X-': new THREE.Vector3(-1, 0, 0), 'Z+': new THREE.Vector3(0, 0, +1), 'Z-': new THREE.Vector3(0, 0, -1)
  }
  const buildCount = 20 + Math.round(rng.nextNumber() * 20)
  for (let i = 0; i < buildCount; ++i) {
    const tiTyKey = chooseFrom(tiTyOptions)
    let tiTy = tiTys[tiTyKey]
    const buildLength = 1 + choose(4)
    const pos = genPos()
    for (let j = 0; j < buildLength; ++j) {
      if (pos.x === 0 || pos.z === 0 || pos.x === dim.x - 1 || pos.z === dim.z - 1) break
      const index = dim.resolve(pos)
      const tiEn = new TiEn(tiTy)
      const rotation = chooseFrom(rotationOptions)
      if (!tiTy.wall) tiEn.rotation = rotation
      if (!tiTy.wall || j < buildLength - 1 || rng.nextNumber() > 0.2) tiEns[index] = tiEn
      if (tiTy.wall) tiEns[dim.resolve(pos.clone().add(new THREE.Vector3(0, 1, 0)))] = new TiEn(tiTys['Wall1'])
      pos.add(rotationToDirection[rotation])
      // if (tiTy.wall) tiTy = tiTyKey === 'Wall0' ? tiTys['Wall1'] : tiTys['Wall0']
    }
  }

  // Test enclosure
  // const testEnclosureSize = 3
  // for (let i = 0; i < testEnclosureSize; ++i) {
  //   for (const coord of ['xz', 'zx']) {
  //     const pos = new THREE.Vector3(1, groundHeight, 1)
  //     pos[coord[0]] += i
  //     pos[coord[1]] += testEnclosureSize - 1
  //     tiEns[dim.resolve(pos)] = new TiEn(tiTys['Wall0'])
  //   }
  // }

  // Ensure access
  const checkNeighbors = (tiEn, pos) => {
    const ofsSet = [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(+1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, +1)]
    for (const ofs of ofsSet) {
      const posNeighbor = pos.clone().add(ofs)
      const tiEnNeighbor = tiEns[dim.resolve(posNeighbor)]
      if (!tiEnNeighbor.tiTy.wall && tiEnNeighbor.visited && tiEnNeighbor.visited.groupIndex !== tiEn.visited.groupIndex) {
        let fr
        let to
        if (tiEnNeighbor.visited.groupIndex < tiEn.visited.groupIndex) {
          fr = tiEnNeighbor
          to = tiEn
        } else {
          fr = tiEn
          to = tiEnNeighbor
        }
        const frGroup = fr.visited
        const toGroup = to.visited
        for (const toTiEn of toGroup.members) {
          toTiEn.visited = frGroup
          if (!frGroup.members.includes(toTiEn)) frGroup.members.push(toTiEn)
        }
        // frGroup.members.push(...toGroup.members)
        return true
      }
    }
    return false
  }
  let groupIndex = 0
  for (let z = 1; z < dim.z - 1; ++z) {
    for (let x = 1; x < dim.x - 1; ++x, ++groupIndex) {
      const pos = new THREE.Vector3(x, groundHeight, z)
      const tiEn = tiEns[dim.resolve(pos)]
      if (!tiEn.tiTy.wall) {
        tiEn.visited = { groupIndex, members: [tiEn] }
        checkNeighbors(tiEn, pos)
      }
    }
  }
  let groups = []
  for (let z = 1; z < dim.z - 1; ++z) {
    for (let x = 1; x < dim.x - 1; ++x) {
      const pos = new THREE.Vector3(x, groundHeight, z)
      const tiEn = tiEns[dim.resolve(pos)]
      if (!tiEn.tiTy.wall) {
        const group = tiEn.visited
        if (!groups.includes(group)) groups.push(group)
        tiEn.entity = pos.clone()
      }
    }
  }

  let merged = false
  while (groups.length > 1) {
    merged = false
    groups.sort((a, b) => {
      if (a.members.length === b.members.length) return a.groupIndex - b.groupIndex
      return a.members.length - b.members.length
    })
    groups[0].groupIndex = ++groupIndex
    const fr = chooseFrom(groups[0].members).entity
    const to = chooseFrom(groups[groups.length - 1].members).entity
    const pos = fr.clone()
    for (const coord of ['x', 'z']) {
      if (merged) break
      while (pos[coord] !== to[coord]) {
        if (merged) break
        if (pos[coord] > to[coord]) --pos[coord]
        else ++pos[coord]
        const tiEn = tiEns[dim.resolve(pos)]
        if (tiEn.tiTy.wall) {
          tiEn.tiTy = tiTys['Pavement']
          tiEn.visited = groups[0]
          groups[0].members.push(tiEn)
          if (checkNeighbors(tiEn, pos)) {
            groups.shift()
            merged = true
            break
          }
        }
      }
    }
  }
  // Cleanup
  for (const tiEn of groups[0].members) {
    tiEn.visited = false
    tiEn.entity = undefined
  }

  // // Debug only
  // const tiTyTest = ['ConveyorSingle0', 'ConveyorDouble0', 'Pavement']
  // let i = 0
  // for (const group of groups) {
  //   const tiTyKey = tiTyTest[i % tiTyTest.length]
  //   const tiTy = tiTys[tiTyKey]
  //   for (const tiEn of group.members) tiEn.tiTy = tiTy
  //   ++i
  // }
  //

  // // Old
  // let floorCount = 0
  // let  = new THREE.Vector3(1, groundHeight, 1)
  // for (let z = 1; z < dim.z - 1; ++z) {
  //   for (let x = 1; x < dim.x - 1; ++x) {
  //     const pos = new THREE.Vector3(x, groundHeight, z)
  //     if (!tiEns[dim.resolve(pos)].wall) ++floorCount
  //   }
  // }
  // const pos = new THREE.Vector3(1, groundHeight, 1)
  // const pending = [new THREE.Vector3(1, groundHeight, 1)]
  // const visited = []
  // while (true) {
  //   const tiEn = tiEns[dim.resolve(pos)]
  //   if (tiEn.visited) continue
  //   tiEn.visited = true
  //   visited.push(pos.clone())
  //   if (!tiEn.wall) --floorCount
  // }
}
