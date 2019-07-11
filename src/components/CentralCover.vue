<template>
  <div class="cover">
    <span class="game-over">GAME OVER</span>
    <template v-if="gameOver === 'draw'">
      <span class="game-over-type">D R A W</span>
      <span class="desc">{{ selectQuip(drawQuips) }}</span>
    </template>
    <template v-else-if="gameOver === 'lms'">
      <span class="game-over-type">LAST BOT STANDING</span>
      <span class="desc">{{ victors }} wins {{ selectQuip(lmsQuips) }}</span>
    </template>
    <template v-else-if="gameOver === 'checkpoint'">
      <span class="game-over-type">CHECKPOINT</span>
      <span class="desc">{{ victors }} wins {{ selectQuip(checkpointQuips) }}</span>
    </template>
  </div>
</template>

<script>
import { glos } from '../internal/Glos'

const drawQuips = ['Everybody died.', 'You are all dead. 🏆', '. . .', 'What are you doing?!', 'Pathetic!', '...how?', 'This isn\'t supposed to happen.']
const lmsQuips = ['by not dying!', 'by not exploding!', 'since everyone else exploded!', 'thanks to violence!', 'due to death and destruction!']
const checkpointQuips = ['by playing as intended!', 'via superior navigation!', 'fair and square!', 'with superb speed!', 'by running away!']

export default {
  name: 'CentralCover',
  data () {
    return {
      drawQuips,
      lmsQuips,
      checkpointQuips,
      glos
    }
  },
  methods: {
    selectQuip (array) {
      return array[Math.floor(this.match.gameOverQuip * array.length)]
    }
  },
  computed: {
    match () {
      return this.glos.game.match
    },
    gameOver () {
      return this.match.gameOver
    },
    victors () {
      return this.match.victors.map(player => player.name).join(' & ')
    }
  }
}
</script>

<style lang="stylus" scoped>
.cover
  position absolute
  width 100%
  height 100%
  background-color rgba(16, 16, 16, 0.75)
  display flex
  flex-direction column
  align-items center
  justify-content center
  text-align center

.game-over
  user-select none
  color grey
  font-size 5em

.game-over-type
  user-select none
  color white
  font-size 8em

.desc
  user-select none
  color white
  font-size 3em
</style>
