import * as THREE from 'three'
import * as TWEEN from '@tweenjs/tween.js'

export class Checkpoint {
  constructor (game, number, pos) {
    this.game = game
    this.number = number

    const geometry = new THREE.TextGeometry(number.toString(), {
      font: game.fonts['Default'],
      size: 0.5,
      height: 0.15
    })
    const text = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.03, 0.03, 1.0) })
    )
    new TWEEN.Tween(text.material.color).to(new THREE.Color(0.1, 0.1, 1.0), 1000).delay((number - 1) * 250).repeatDelay(game.match.checkpointCount * 250).easing(TWEEN.Easing.Quartic.Out).repeat(Infinity).yoyo(true).start()
    text.rotateX(-0.5 * Math.PI)
    text.position.copy(pos).add(new THREE.Vector3(-0.20, -0.25 - 0.1, +0.25))
    text.bloom = true
    game.scene.add(text)
    this.text = text
    this.checkPosition = pos.clone()
  }
}
