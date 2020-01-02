<template>
  <div class="footer flex row" @mousedown="onMousedown">
    <!-- <q-card dark class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :flat="!cardSlot.card">
    <template v-if="cardSlot.card">
      <span>{{ cardSlot.card.cardType.title }}</span>
    </template>
    </q-card> -->

    <draggable class="card-slots" :list="cardSlots" group="bot-card-slots" :move="checkCardMove" @end="onMouseup">
      <q-btn v-for="(cardSlot, index) in cardSlots" :key="index" class="card" :push="!!cardSlot.card" :color="cardSlotToColor(cardSlot, index === turnCardIndex)" rounded no-caps @dragstart="dragCard(cardSlot)" @dragend="dragCardStop" @drop="dropCard(cardSlot)" :disable="disableAct" @click="removeCard(cardSlot)">
        <template v-if="cardSlot.card">
          <img :src="`statics/cards/${cardSlot.card.cardType.key}.svg`" />
          <span>{{ cardSlot.card.cardType.title }}</span>
        </template>
        <template v-else>
          <span class="text-grey-8">Slot {{ index + 1 }}</span>
        </template>
      </q-btn>
    </draggable>
    <div class="flex flex-center column">
      <q-btn push color="white" text-color="primary" round size="xl" class="end-turn" @click="endTurn" :disable="disableAct">
        <q-circular-progress
          :value="timeSec"
          :max="durationSec"
          show-value
          track-color="grey"
          color="primary"
          size="2.5em"
          v-if="turnTimerRunning"
        >
          {{ timeSec.toFixed(0) }}s
        </q-circular-progress>
        <q-icon v-else name="arrow_right" />
        <q-tooltip>End turn.</q-tooltip>
      </q-btn>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { glos } from '../internal/Glos'
import { Card, CardSlot } from '../internal/game'

export default {
  name: 'CtrlFooter',
  components: {
    draggable
  },
  data () {
    return {
      glos
    }
  },
  methods: {
    // stopEvent (event) {
    //   event.stopPropagation()
    //   event.preventDefault()
    // },
    endTurn () {
      // glos.game.match.startTurn()
      glos.game.endTurn()
    },
    onMousedown () {
      if (glos.threejsControls) glos.threejsControls.enabled = false
      document.addEventListener('mouseup', () => this.onMouseup(), { once: true })
    },
    onMouseup () {
      if (glos.threejsControls) glos.threejsControls.enabled = true
    },
    checkCardMove (event) {
      // if (!event.draggedContext.element.card) return false
      // if (!event.relatedContext.element.card) return false
      return false
    },
    cardSlotToColor (cardSlot, active) {
      return cardSlot.card ? (active ? 'light-blue-6' : 'primary') : (active ? 'grey-3' : undefined)
    },
    dragCard (cardSlot) {
      glos.dragged = cardSlot
    },
    dragCardStop () {
      glos.dragged = undefined
    },
    dropCard (cardSlot) {
      if (this.disableAct) return
      if (glos.dragged instanceof CardSlot) {
        const card = glos.dragged.card
        glos.dragged.card = cardSlot.card
        cardSlot.card = card
      } else if (glos.dragged instanceof Card && !cardSlot.card) {
        cardSlot.card = glos.dragged
        glos.dragged.removeFromHand()
      }
      glos.dragged = undefined
    },
    removeCard (cardSlot) {
      const card = cardSlot.card
      if (card) {
        cardSlot.card = undefined
        glos.hand.push(card)
      }
    }
  },
  computed: {
    game () { return this.glos.game },
    match () { return this.game.match },
    cardSlots () {
      return this.glos.cardSlots // this.glos.game && this.glos.game.match && this.glos.game.match.playerSelf.bot.cardSlots
    },
    disableAct () {
      return this.match && (this.match.turnInProgress || !!this.match.gameOver || this.match.playerSelf.endTurn || !this.alive)
    },
    turnCardIndex () {
      return this.match && this.match.turnCardIndex
    },
    alive () {
      return this.match.playerSelf.alive
    },
    turnTimerRunning () {
      return this.game.turnTimer.running
    },
    timeSec () {
      return Math.max(this.durationSec - this.game.turnTimer.elapsedTime, 0)
    },
    durationSec () {
      return this.game.netMatch.endTurnTimeLimit
    }
  },
  watch: {
    timeSec (newValue) {
      if (newValue <= 0 && this.turnTimerRunning && !this.disableAct) this.endTurn()
    }
  }
}
</script>

<style lang="stylus" scoped>
.footer
  position absolute
  bottom 0
  width 100%
  height 15em
  background-color rgba(64, 64, 64, 0.5)
  overflow-x auto

  display flex
  flex-flow row nowrap

  @media (max-width: 1100px)
    height 10em

.card
  background-color rgba(16, 16, 16, 0.75)
  margin-left 0.75em
  margin-top 0.75em
  margin-bottom 0.75em
  width 9em
  img
    width 90%

  @media (max-width: 1100px)
    width 6em

.card-slots
  display flex
  flex-flow row nowrap
  flex 1 1 auto

.end-turn
  margin-left 0.75em
  margin-right 0.75em
</style>
