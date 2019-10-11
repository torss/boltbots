// Based on the "libp2p-ipfs-browser" bundle from https://github.com/libp2p/js-libp2p#bundles in https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/libp2p-browser.js
// Also see https://github.com/libp2p/js-libp2p/blob/master/examples/libp2p-in-the-browser/1/src/browser-bundle.js

const WebRTCStar = require('libp2p-webrtc-star')
const WebSockets = require('libp2p-websockets')
const WebSocketStar = require('libp2p-websocket-star')
const Multiplex = require('pull-mplex')
const SECIO = require('libp2p-secio')
const Bootstrap = require('libp2p-bootstrap')
const KadDHT = require('libp2p-kad-dht')
const GossipSub = require('libp2p-gossipsub')
const libp2p = require('libp2p')
const mergeOptions = require('merge-options')

const bootstrapList = [
  // https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/config-browser.js
  '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/ipfs/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  '/dns4/node0.preload.ipfs.io/tcp/443/wss/ipfs/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
  '/dns4/node1.preload.ipfs.io/tcp/443/wss/ipfs/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'

  // Old:
  // Find this list at: https://github.com/ipfs/js-ipfs/blob/master/src/core/runtime/config-browser.json
  // '/dns4/ams-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLer265NRgSp2LA3dPaeykiS1J6DifTC88f5uVQKNAd',
  // '/dns4/sfo-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx',
  // '/dns4/lon-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLMeWqB7YGVLJN3pNLQpmmEk35v6wYtsMGLzSr5QBU3',
  // '/dns4/sfo-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z',
  // '/dns4/sfo-3.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLPppuBtQSGwKDZT2M73ULpjvfd3aZ6ha4oFGL1KrGM',
  // '/dns4/sgp-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLSafTMBsPKadTEgaXctDQVcqN88CNLHXMkTNwMKPnu',
  // '/dns4/nyc-1.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLueR4xBeUbY9WZ9xGUUxunbKWcrNFTDAadQJmocnWm',
  // '/dns4/nyc-2.bootstrap.libp2p.io/tcp/443/wss/p2p/QmSoLV4Bbm51jM9C4gDYZQ9Cy3U6aXMJDAbzgu2fzaDs64',
  // '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
  // '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
]

export class NetNode extends libp2p {
  constructor (_options) {
    const wrtcStar = new WebRTCStar({ id: _options.peerInfo.id })
    const wsstar = new WebSocketStar({ id: _options.peerInfo.id })

    const defaults = {
      switch: {
        denyTTL: 2 * 60 * 1e3, // 2 minute base
        denyAttempts: 5, // back off 5 times
        maxParallelDials: 100,
        maxColdCalls: 25,
        dialTimeout: 20e3
      },
      modules: {
        transport: [
          wrtcStar,
          WebSockets,
          wsstar
        ],
        streamMuxer: [
          Multiplex
        ],
        connEncryption: [
          SECIO
        ],
        peerDiscovery: [
          wrtcStar.discovery,
          wsstar.discovery,
          Bootstrap
        ],
        dht: KadDHT,
        pubsub: GossipSub
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          webRTCStar: {
            enabled: true
          },
          websocketStar: {
            enabled: true
          },
          bootstrap: {
            interval: 20e3,
            enabled: true,
            list: bootstrapList
          }
        },
        relay: {
          enabled: true,
          hop: {
            enabled: false,
            active: false
          }
        },
        dht: {
          enabled: false
        },
        pubsub: {
          enabled: true,
          emitSelf: true
        }
      }
    }

    super(mergeOptions(defaults, _options))
  }
}

// https://github.com/libp2p/js-libp2p/blob/master/examples/libp2p-in-the-browser/1/src/create-node.js
const PeerInfo = require('peer-info')
export function createNetNode (callback) {
  PeerInfo.create((err, peerInfo) => {
    if (err) {
      return callback(err)
    }

    const peerIdStr = peerInfo.id.toB58String()
    const webrtcAddr = `/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/p2p/${peerIdStr}`
    const wsAddr = `/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star`

    peerInfo.multiaddrs.add(webrtcAddr)
    peerInfo.multiaddrs.add(wsAddr)

    const netNode = new NetNode({
      peerInfo
    })

    netNode.idStr = peerIdStr
    callback(null, netNode)
  })
}

let singleton
export function createNetNodeSingleton (callback) {
  if (singleton) singleton.stop()
  createNetNode((error, netNode) => {
    singleton = netNode
    callback(error, netNode)
  })
}
