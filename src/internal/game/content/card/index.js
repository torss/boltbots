import * as movement from './Movement'

export const cardTypeList = [
  ...movement.cardTypeList
]

export const cardTypes = cardTypeList.reduce((obj, item) => {
  obj[item.key] = item
  return obj
}, {})
