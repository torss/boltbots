import * as THREE from 'three'
import { assignNewVueObserver } from '../Dereactivate'
import { ControlTower } from './ControlTower'
import { Card } from './Card'
import { cardTypeList, initPlayer } from './content'
import { Rng } from '../Rng'
import { Checkpoint } from './Checkpoint'

export class Match {
  constructor (game) {
    this.players = []
    this.turnPlayers = [] // These players must be alive
    this.deadPlayers = []
    this.playerSelf = undefined
    this.turn = 1
    this.turnInProgress = false
    this.gameOver = false
    this.gameOverQuip = 0
    this.victors = []
    this.handSize = 8
    this.damageLazor = 0.20
    this.damageShove = 0.05
    this.damageCrush = 0.15
    this.turnCardIndex = -1
    assignNewVueObserver(this)

    this.game = game
    this.mapGen = undefined
    this.map = undefined
    this.openTileCount = 0
    this.checkpointCount = 3
    this.slotCount = 5
    // this.playerSelfUid = -1
    this.turnPlayerIndex = 0
    this.remainingActionCount = 0
    this.controlTower = new ControlTower()
    this.checkpoints = []
    this.actionType = 'lazor'
    this.endTurn = false
    this.rng = new Rng(0, 0) // Primary rng
    this.rngMapGen = new Rng(0, 0) // MapGen rng
    this.rngCosmetic = new Rng(0, 0) // Unimportant rng
    this.rngPlaceBots = new Rng(0, 0) // Post-MapGen Bot placement rng
  }

  get turnPlayer () {
    return this.turnPlayers[this.turnPlayerIndex]
  }

  startTurn () {
    this.turnInProgress = true
    this.turnPlayers = this.players.filter(player => player.alive)
    this.turnCardIndex = 0
    this.turnPlayerIndex = -1
    this.prepareTurnPlayers()
    this.progressTurn()
  }

  completeTurn () {
    for (const player of this.turnPlayers) {
      // Clear used cards
      player.bot.clearCardSlots()
      // Refill hands
      // NOTE Currently only implicitly refills playerSelf, since the networking doesn't sync the hands, thus everyone will have the same card progression.
      for (let i = player.hand.length; i < this.handSize; ++i) {
        const cardType = cardTypeList[Math.floor(this.rng.nextNumber() * cardTypeList.length)]
        player.hand.push(new Card(cardType))
      }
    }
    this.turnCardIndex = -1
    this.turnPlayerIndex = -1
    if (this.turnPlayers.length === 0) this.gameOver = 'draw'
    else if (this.turnPlayers.length === 1) {
      this.gameOver = 'lms'
      this.victors = [this.turnPlayers[0]]
    }
    if (!this.gameOver) ++this.turn
    this.gameOverQuip = this.rngCosmetic.nextNumber()

    // this.turnInProgress = false
    this.game.completeTurn()
  }

  prepareTurnPlayers () {
    // for (const player of this.turnPlayers) player.tieBreaker = this.rng.nextNumber()
    this.turnPlayers.sort((a, b) => {
      if (Math.abs(a.bot.towerDistance - b.bot.towerDistance) < Number.EPSILON) {
        // return a.tieBreaker - b.tieBreaker
        return a.netKey.localeCompare(b.netKey)
      }
      return a.bot.towerDistance - b.bot.towerDistance
    })
  }

  actionDone () {
    --this.remainingActionCount
    if (this.remainingActionCount === 0) {
      switch (this.actionType) {
        case 'lazor':
          // Run conveyor belts
          this.actionType = 'conveyor'
          this.turnPlayerIndex = -1
          this.remainingActionCount = 1
          this.actionDone()
          break
        case 'conveyor':
          ++this.turnPlayerIndex
          this.remainingActionCount = 1
          if (this.turnPlayer) this.turnPlayer.bot.conveyor()
          else this.progressTurnNextCardSlot()
          break
        default:
          console.error('Match::actionDone - Unknown actionType:', this.actionType)
          this.progressTurnNextCardSlot()
          break
      }
    }
  }

  progressTurnNextCardSlot () {
    ++this.turnCardIndex
    this.turnPlayerIndex = -1
    this.prepareTurnPlayers()
    this.progressTurn()
  }

  progressTurn () {
    if (this.turnPlayers.length === 0 || this.gameOver) {
      this.completeTurn()
      return // No players or other game over kind (checkpoint victory)
    }
    while (true) {
      ++this.turnPlayerIndex
      if (this.turnPlayer) {
        let moreSlotsExist = false
        while (this.turnPlayer) {
          const bot = this.turnPlayer.bot
          if (bot.invokeCardSlot(this.turnCardIndex)) return // Next card invoked
          if (this.turnCardIndex < bot.cardSlots.length) moreSlotsExist = true
          ++this.turnPlayerIndex
        }
        if (moreSlotsExist) {
          // Skipped a slot (no one had any cards in a slot at the current index)
          continue
        } else {
          // Turn complete
          this.completeTurn()
          return
        }
      } else {
        if (this.turnPlayers.length > 0) {
          // Fire lazors!
          this.actionType = 'lazor'
          this.remainingActionCount = this.turnPlayers.length
          for (const player of this.turnPlayers) player.bot.shoot()
          return
        } else this.progressTurnNextCardSlot()
      }
    }
  }

  setRngSeed (seed) {
    const create = () => new Rng(seed[0], seed[1])
    this.rng = create()
    this.rngMapGen = create()
    this.rngCosmetic = create()
    this.rngPlaceBots = this.rngMapGen.clone()
  }

  setRngSeedStr (seedStr) {
    // String seed to seed numbers
    const seed = [0, 0]
    for (let i = 0; i < seedStr.length; ++i) {
      seed[i % 2] += seedStr.charCodeAt(i)
    }
    this.setRngSeed(seed)
  }

  isTileOpen (tiEn) {
    return !tiEn.tiTy.wall && !tiEn.special
  }

  destroyPlayers () {
    const match = this
    for (const player of match.players) player.destroy()
    match.players = []
    match.turnPlayers = []
    match.deadPlayers = []
  }

  regenerateMap () {
    const match = this

    // Destroy old stuff
    if (match.map) match.map.destroy()
    match.map = undefined
    for (const checkpoint of match.checkpoints) checkpoint.object3d.removeSelf()
    match.checkpoints = []
    // - //

    const game = match.game
    const { map, controlTowerTilePosition } = match.mapGen.func(game)
    map.tiMa.materials.default = game.materials['MapDefault']
    map.remesh(game.scene)
    match.map = map
    match.controlTower.position.copy(controlTowerTilePosition).addScalar(0.5)

    // Place checkpoints
    for (let i = 1; i <= match.checkpointCount; ++i) {
      match.iterateRandomMapPoint((tiEn, pos) => {
        if (tiEn.tiTy.key === 'Pavement') { // if (!tiEn.tiTy.wall) {
          const checkpoint = new Checkpoint(game, i, pos)
          tiEn.special = checkpoint
          match.checkpoints.push(checkpoint)
          return true
        }
      })
    }

    // Count open tiles
    match.openTileCount = 0
    match.iterateMap((tiEn, pos) => {
      if (match.isTileOpen(tiEn)) ++match.openTileCount
    })

    if (match.openTileCount < 2) {
      console.warn('Seed generated a map without enough open tiles, regenerating...')
      match.regenerateMap()
    }
  }

  placeBots () {
    const match = this
    match.rngPlaceBots = match.rngMapGen.clone()
    const rng = match.rngPlaceBots
    for (const player of match.players) {
      player.bot.clearTiEns()
      player.bot.directionKey = 'N'
    }
    for (const player of match.players) {
      if (!player.alive) continue // Superfluous
      match.iterateRandomMapPoint((tiEn, pos) => {
        if (match.isTileOpen(tiEn) && !tiEn.entity) {
          const { bot } = player
          bot.rotate(rng.choose(4), false)
          bot.object3d.position.copy(pos)
          bot.enterOnMap()
          return true
        }
      }, rng)
    }
  }

  iterateMap (func, rng) {
    const match = this
    const { map } = match
    const { dim, tiEns } = map.tiMa

    for (let z = 1; z < dim.z - 1; ++z) {
      for (let x = 1; x < dim.x - 1; ++x) {
        const pos = new THREE.Vector3(x, map.groundHeight, z)
        const index = dim.resolve(pos)
        const tiEn = tiEns[index]
        if (func(tiEn, pos)) break
      }
    }
  }

  iterateRandomMapPoint (func, rng = undefined) {
    const match = this
    const { map } = match
    const { dim, tiEns } = map.tiMa
    if (!rng) rng = match.rngMapGen

    while (true) {
      const pos = new THREE.Vector3(1 + rng.choose(dim.x - 2), map.groundHeight, 1 + rng.choose(dim.z - 2))
      const index = dim.resolve(pos)
      const tiEn = tiEns[index]
      if (func(tiEn, pos)) break
    }
  }

  removePlayerByFunc (func) {
    const index = this.players.findIndex(func)
    if (index >= 0) {
      const player = this.players[index]
      player.destroy()
      this.players.splice(index, 1)
      // this.placeBots()
      return player
    }
  }

  // removePlayerById (playerId) { this.removePlayerByFunc(player => player.id === playerId) }
  removePlayerByNetKey (netKey) { this.removePlayerByFunc(player => player.netKey === netKey) }
  getPlayerById (playerId) { return this.players.find(player => player.id === playerId) }
  getPlayerByNetKey (netKey) { return this.players.find(player => player.netKey === netKey) }
  getPlayerByPnid (pnid) { return this.players.find(player => player.pnid === pnid) }

  serialize () {
    const { turn, rng, rngMapGen, rngCosmetic, rngPlaceBots, players, handSize, checkpointCount, slotCount, endTurn, checkpoints } = this
    return {
      ...{ turn, handSize, checkpointCount, slotCount, endTurn },
      rng: rng.serialize(),
      rngMapGen: rngMapGen.serialize(),
      rngCosmetic: rngCosmetic.serialize(),
      rngPlaceBots: rngPlaceBots.serialize(),
      players: players.map(player => player.serialize(true)),
      checkpoints: checkpoints.map(checkpoint => checkpoint.serialize())
    }
  }

  deserialize (matchData) {
    const { turn, checkpointCount, handSize, slotCount, endTurn, rng, rngMapGen, rngCosmetic, rngPlaceBots, players, checkpoints } = matchData
    if (turn !== undefined) this.turn = turn
    if (checkpointCount !== undefined) this.checkpointCount = checkpointCount
    if (handSize !== undefined) this.handSize = handSize
    if (slotCount !== undefined) this.slotCount = slotCount
    if (endTurn !== undefined) this.endTurn = endTurn
    if (rng !== undefined) this.rng.deserialize(rng)
    if (rngMapGen !== undefined) this.rngMapGen.deserialize(rngMapGen)
    if (rngCosmetic !== undefined) this.rngCosmetic.deserialize(rngCosmetic)
    if (rngPlaceBots !== undefined) this.rngPlaceBots.deserialize(rngPlaceBots)
    if (checkpoints !== undefined) {
      for (const checkpoint of this.checkpoints) checkpoint.destroy()
      this.checkpoints = checkpoints.map(data => Checkpoint.deserializeNew(this.game, data))
    }
    if (players !== undefined) {
      this.destroyPlayers()
      const { game } = this
      for (const playerData of players) {
        let player = this.getPlayerById(playerData.id)
        // player.bot.cardSlotsNext = undefined // For host
        if (!player) player = initPlayer(game, playerData)
        else player.deserialize(playerData)
        playerData.id = player.id
      }
      for (const playerData of players) {
        const { killedBy, id } = playerData
        if (id === undefined) continue
        const player = this.getPlayerById(id)
        if (!killedBy) player.killedBy = []
        else player.killedBy = killedBy.map(playerId => this.getPlayerById(playerId))
      }
      this.turnPlayers = []
      this.deadPlayers = []
      for (const player of this.players) {
        if (player.alive) this.turnPlayers.push(player)
        else this.deadPlayers.push(player)
      }
    }
  }

  enterBots () {
    for (const player of this.players) {
      const { bot } = player
      if (!bot || !bot.alive || !player.alive) continue
      bot.clearTiEns()
    }
    for (const player of this.players) {
      const { bot } = player
      if (!bot || !bot.alive || !player.alive) continue
      bot.enterOnMap()
    }
  }
}
