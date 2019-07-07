<template>
  <q-item v-ripple dense>
    <q-item-section side>
      <q-icon :name="'mdi-' + player.icon" :style="'color: #' + player.bot.guiColor.getHexString()" />
    </q-item-section>
    <q-item-section avatar>
      <q-item-label class="player-name" :class="!player.alive && 'player-name-dead'">{{ player.name }}</q-item-label>
      <q-tooltip>Player name</q-tooltip>
    </q-item-section>
    <template  v-if="player.alive">
      <q-item-section>
        <q-linear-progress stripe rounded style="height: 20px" :value="player.bot.health" color="red" />
        <q-tooltip>Bot health: {{ (player.bot.health * 100).toFixed(0) }}%</q-tooltip>
      </q-item-section>
      <q-item-section side>
        <q-item-label class="tower-distance" v-if="player.alive">{{ player.bot.towerDistance.toFixed(2) }}m</q-item-label>
        <q-item-label class="tower-distance-dead" v-else>☠️</q-item-label>
        <q-tooltip>Distance to control tower</q-tooltip>
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
export default {
  name: 'PlayerListItem',
  props: {
    player: Object
  }
}
</script>

<style lang="stylus" scoped>
.player-name
  min-width 4em

.player-name-dead
  text-decoration line-through

.tower-distance
  min-width 3.5em
  text-align right

.tower-distance-dead
  min-width 3.5em
  text-align center
</style>