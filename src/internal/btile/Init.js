// import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { LoaderItemGltf } from '../LoaderControl'
// import { TiSh } from './TiSh'

const tilePaths = [
  'Cube',
  'CubeQuarter',
  'Wall0',
  'Wall1',
  'Floor0',
  'ConveyorSingle0',
  'ConveyorDouble0',
  'ControlTower0'
]

export function btileLoaderItemsCreate () {
  return tilePaths.map((tilePath) => new LoaderItemGltf('statics/models/tiles/' + tilePath + '.glb', tilePath))
}

// export function btileInit (...funcs) {
//   const gltfLoader = new GLTFLoader()

//   const tiShs = {}

//   for (const tilePath of tilePaths) {
//     gltfLoader.load('statics/models/tiles/' + tilePath + '.glb', (gltf) => {
//       tiShs[tilePath] = new TiSh(gltf.scene)

//       if (Object.keys(tiShs).length === tilePaths.length) {
//         for (const func of funcs) {
//           func({ tiShs })
//         }
//       }
//     })
//   }
// }
