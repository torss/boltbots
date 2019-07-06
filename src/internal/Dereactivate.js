import Vue from 'vue'

const ObserverConstructor = (new Vue()).$data.__ob__.constructor
const dummyObserver = new ObserverConstructor({})

export function dereactivate (stuff) {
  stuff.__ob__ = dummyObserver
  return stuff
}

export function assignNewVueObserver (objectOrArray) {
  return new ObserverConstructor(objectOrArray)
}
