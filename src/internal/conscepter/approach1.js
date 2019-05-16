/* eslint-disable no-unused-vars */
import * as THREE from 'three'
import {CsBuf} from './CsBuf'
import {CsPipe, CsPipeCmd} from './CsPipe'
import {CsFraw} from './CsFraw'

export function testConstruct (bufferSet) {
  testConstruct2(bufferSet)
}

export function testConstruct1 (bufferSet) {
  console.time('testConstruct-1-1')
  const csBuf = new CsBuf({default: bufferSet})
  const rotation = new THREE.Matrix3().makeRotationFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5 * Math.PI))
  new CsPipe(128).runCmds(csBuf, [
    new CsPipeCmd().makeBase(undefined, rotation),
    new CsPipeCmd().makeLength(0.125),
    new CsPipeCmd().makeRadius(0.125),
    new CsPipeCmd().makeRadius(0.08),
    new CsPipeCmd().makeLength(0.25),
    new CsPipeCmd().makeRadius(0.08),
    new CsPipeCmd().makeLength(0.05),
    new CsPipeCmd().makeRadius(0.09),
    new CsPipeCmd().makeRadius(0.09),
    new CsPipeCmd().makeRadius(0.08),
    new CsPipeCmd().makeLength(-0.05),
    new CsPipeCmd().makeRadius(0.05),
    new CsPipeCmd().makeLength(-0.375),
    new CsPipeCmd().makeRadius(0.05)
  ])
  console.timeEnd('testConstruct-1-1')
}

export function testConstruct2 (bufferSet) {
  console.time('testConstruct-1-2')
  const csBuf = new CsBuf({default: bufferSet})
  new CsFraw().testConstruct(csBuf) // TODO
  console.timeEnd('testConstruct-1-2')
}
