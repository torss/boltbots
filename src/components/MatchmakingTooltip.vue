<template>
  <q-tooltip>
    <template v-if="type === 'endTurnTimeLimit'">
      This time (in seconds) will start to run out once a player has finished his turn.<br>
      If the other players can't end their turns within this time limit, it will end automatically.<br>
      Set this to 0 to disable the time limit.
    </template>
    <template v-else-if="type === 'checkpointCount'">
      How many checkpoints need to be reached by a player to attain a checkpoint victory.<br>
      These checkpoints have to be travesed in the correct order.<br>
      Note that victory can alternatively be achieved by destroying all other bots.
    </template>
    <template v-else-if="type === 'handSize'">
      How many cards each player can hold on his hand per turn.<br>
      This thus changes the amount of options each player will have available.
    </template>
    <template v-else-if="type === 'slotCount'">
      The number of card slots each player's bot has.<br>
      A turn consists out of executing the slots.<br>
      More slots will make it more difficult to predict the turn. Conversely, less slots make it easier to react to the other players' actions.
    </template>
  </q-tooltip>
</template>

<script>
export default {
  name: 'MatchmakingTooltip',
  props: {
    type: String
  }
}
</script>

<style lang="stylus" scoped>
</style>
