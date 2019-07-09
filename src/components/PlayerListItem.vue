<template>
  <q-item v-ripple dense>
    <q-item-section side>
      <q-icon :name="'mdi-' + player.icon" :style="'color: #' + player.bot.guiColor.getHexString()" />

      <q-rating icon="mdi-flag-variant" readonly v-model="player.completedCheckpoints" :max="checkpointCount" size="0.25em" color="primary"/>
      <q-tooltip>Completed checkpoints out of the {{ checkpointCount }} total checkpoints.<br>The checkpoints have to be completed in order,<br>and your bot must land directly on a checkpoint for it to be completed.<br>Completing all checkpoints wins you the game!</q-tooltip>
    </q-item-section>
    <q-item-section avatar>
      <q-item-label class="player-name" :class="className">
        {{ player.name }}
        <q-tooltip>Player name.<br>Player turn: {{ player.endTurn ? 'Finished' : 'In progress' }}</q-tooltip>
      </q-item-label>
    </q-item-section>
    <template  v-if="player.alive">
      <q-item-section>
        <q-linear-progress stripe rounded style="height: 20px" :value="player.bot.health" color="red" />
        <q-tooltip>Bot health: {{ (player.bot.health * 100).toFixed(0) }}%</q-tooltip>
      </q-item-section>
      <q-item-section side>
        <span>
          <q-item-label class="tower-distance" v-if="player.alive">{{ player.bot.towerDistance.toFixed(2) }}m</q-item-label>
          <q-item-label class="tower-distance-dead" v-else>☠️</q-item-label>
          <q-tooltip>Distance to control tower.</q-tooltip>
        </span>
      </q-item-section>
    </template>
    <q-item-section v-else>
      <q-item-label caption>
        Killed in turn {{ player.killedInTurn }} by {{ player.killedBy.map(player => player.name).join(' & ') }}.
      </q-item-label>
    </q-item-section>

    <!-- <q-item-section>
      <div dense class="row">
        <q-item-section side>
          <q-icon :name="'mdi-' + player.icon" :style="'color: #' + player.bot.guiColor.getHexString()" />
        </q-item-section>
        <q-item-section avatar>
          <q-item-label class="player-name" :class="!player.alive && 'player-name-dead'">{{ player.name }}</q-item-label>
          <q-tooltip>Player name</q-tooltip>
        </q-item-section>
        <q-item-section>
          <q-linear-progress stripe rounded style="height: 20px" :value="player.bot.health" color="red" />
          <q-tooltip>Bot health: {{ (player.bot.health * 100).toFixed(0) }}%</q-tooltip>
        </q-item-section>
        <q-item-section side>
          <q-item-label class="tower-distance" v-if="player.alive">{{ player.bot.towerDistance.toFixed(2) }}m</q-item-label>
          <q-item-label class="tower-distance-dead" v-else>☠️</q-item-label>
          <q-tooltip>Distance to control tower</q-tooltip>
        </q-item-section>
      </div>
      <q-item-section>
        <q-item-label caption v-if="!player.alive">
          Killed in turn {{ player.killedInTurn }} by {{ player.killedBy.map(player => player.name).join(' & ') }}
        </q-item-label>
      </q-item-section>
    </q-item-section> -->
  </q-item>
</template>

<script>
import { glos } from '../internal/Glos'

export default {
  name: 'PlayerListItem',
  props: {
    player: Object
  },
  data () {
    return {
      glos
    }
  },
  computed: {
    checkpointCount () {
      return this.glos.game ? this.glos.game.match.checkpointCount : 0
    },
    className () {
      return {
        'player-name-dead': !this.player.alive,
        'player-name-done': this.player.endTurn
      }
    }
  }
}
</script>

<style lang="stylus" scoped>
.player-name
  min-width 4em

.player-name-dead
  text-decoration line-through

.player-name-done
  color $primary

.tower-distance
  min-width 3.5em
  text-align right

.tower-distance-dead
  min-width 3.5em
  text-align center
</style>
