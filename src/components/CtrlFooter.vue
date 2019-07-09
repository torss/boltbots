<template>
  <div class="footer flex row" @mousedown="onMousedown">
    <!-- <q-card dark class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :flat="!cardSlot.card">
    <template v-if="cardSlot.card">
      <span>{{ cardSlot.card.cardType.title }}</span>
    </template>
    </q-card> -->

    <div class="card-slots">
      <draggable class="card-slots" :list="cardSlots" group="bot-card-slots" :move="checkCardMove" @end="onMouseup">
        <q-btn v-for="(cardSlot, index) in cardSlots" :key="index" class="card flex flex-center column" :push="!!cardSlot.card" :color="cardSlotToColor(cardSlot, index === turnCardIndex)" rounded no-caps @dragstart="dragCard(cardSlot)" @dragend="dragCardStop" @drop="dropCard(cardSlot)" :disable="disableAct" @click="removeCard(cardSlot)">
          <template v-if="cardSlot.card">
            <span>{{ cardSlot.card.cardType.title }}</span>
          </template>
          <template v-else>
            <span class="text-grey-8">Slot {{ index + 1 }}</span>
          </template>
        </q-btn>
      </draggable>
      <div class="flex flex-center column">
        <q-btn push color="white" text-color="primary" round size="xl" @click="endTurn" :disable="disableAct">
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
        </q-btn>
      </div>
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
      return this.match && (this.match.turnInProgress || !!this.match.gameOver || this.done || !this.alive)
    },
    turnCardIndex () {
      return this.match && this.match.turnCardIndex
    },
    alive () {
      return this.match.playerSelf.alive
    },
    done () {
      return this.match.playerSelf.endTurn
    },
    turnTimerRunning () {
      return this.glos.game.turnTimer.running
    },
    timeSec () {
      return Math.max(this.durationSec - this.glos.game.turnTimer.elapsedTime, 0)
    },
    durationSec () {
      return this.glos.game.netMatch.endTurnTimeLimit
    }
  },
  watch: {
    timeSec (newValue) {
      if (newValue === 0 && !this.done && this.turnTimerRunning && !this.disableAct) this.endTurn()
    }
  }
}
</script>

<style lang="stylus" scoped>
.footer
  position fixed
  bottom 0
  width 100%
  height 25vh
  background-color rgba(64, 64, 64, 0.5)
  overflow-y auto

.card
  background-color rgba(16, 16, 16, 0.75)
  width 10em
  margin 1em

.card-slots
  display flex
  flex-wrap none
</style>
