import {CsCipts} from './CsCipts'

export class CsBuf {
  constructor (bufferSets) {
    this.bufferSets = bufferSets
    this.bufferSet = bufferSets ? bufferSets.default : undefined
    this.ciptsBase = new CsCipts()
    this.ciptsTmp0 = new CsCipts()
    this.ciptsTmp1 = new CsCipts()
    this.ciptsTmp2 = new CsCipts()
  }
}
