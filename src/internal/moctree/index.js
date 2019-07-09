/**
 * @author torss / https://github.com/torss
 *
 * Mighty Magical Merging Octree (that is hopefully Magnificent too)
 */

import { MoctCubeSide, moctCubeSides } from './MoctCubeSide'
export { MoctCubeSide, moctCubeSides } from './MoctCubeSide'
import { MoctOctant, moctOctants } from './MoctOctant'
export { MoctOctant, moctOctants } from './MoctOctant'

for (const coord of 'xyz') {
  for (const sign of [-1, 1]) moctCubeSides.push(new MoctCubeSide(coord, sign))
}
for (let i = 0; i < moctCubeSides.length; ++i) moctCubeSides[i].index = i

{
  let index = -1
  const range = [-1, 1]
  for (const z of range) {
    for (const y of range) {
      for (const x of range) {
        moctOctants.push(new MoctOctant(x, y, z, ++index))
      }
    }
  }
}

for (const moctOctant of moctOctants) moctOctant.completeRegularOctant()
for (const moctCubeSide of moctCubeSides) moctCubeSide.completeCubeSide()

export const moctOctantTln = new MoctOctant(0, 0, 0) // Special top-level-node pseudo-octant

export { Moctree } from './Moctree'
export * from './MoctMesher'
export * from './shapes'
export * from './iterators'
