const sideNames = Object.freeze([
  'X-', 'X+',
  'Y-', 'Y+',
  'Z-', 'Z+'
])

export class Sides {
  constructor (initValue) {
    for (const sideName of sideNames) this[sideName] = typeof initValue === 'function' ? initValue(sideName) : initValue
  }

  iterate (func) {
    for (const sideName of sideNames) func(sideName, this[sideName])
  }

  // map (func) {
  //   return new Sides(sideName => func(this[sideName], sideName))
  // }
}

export const oppositeSideNames = Object.freeze(new Sides(sideName => {
  return sideName[0] + (sideName[1] === '+' ? '-' : '+')
}))

// export const nameIsSide = new Sides(true).freeze()
// export const nameIsSide = sideNames.reduce((obj, side) => {
//   obj[side] = true
//   return obj
// }, {}).freeze()
