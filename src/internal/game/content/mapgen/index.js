import * as simpleMapGen from './SimpleMapGen'

const mapGenList = [
  ...simpleMapGen.mapGenList
]

export const mapGens = mapGenList.reduce((obj, mapGen) => {
  obj[mapGen.key] = mapGen
  return obj
}, {})
