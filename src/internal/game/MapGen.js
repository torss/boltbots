/**
 * Map generator superclass.
 */
export class MapGen {
  constructor (apiVersion) {
    this.apiVersion = apiVersion
  }

  static createV0 (name, func) {
    const mapGen = new MapGen(0)
    mapGen.key = name
    mapGen.name = name
    mapGen.func = func
    return mapGen
  }
}
