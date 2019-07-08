<template>
  <div class="footer flex row" @mousedown="onMousedown">
    <!-- <q-card dark class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :flat="!cardSlot.card">
    <template v-if="cardSlot.card">
      <span>{{ cardSlot.card.cardType.title }}</span>
    </template>
    </q-card> -->

    <div class="card-slots">
      <draggable class="card-slots" :list="cardSlots" group="bot-card-slots" :move="checkCardMove" @end="onMouseup">
        <q-btn v-for="(cardSlot, index) in cardSlots" :key="index" class="card flex flex-center column" :push="!!cardSlot.card" :color="cardSlotToColor(cardSlot)" rounded no-caps @dragstart="dragCard(cardSlot)" @dragend="dragCardStop" @drop="dropCard(cardSlot)" :disable="disableAct" @click="removeCard(cardSlot)">
          <template v-if="cardSlot.card">
            <span>{{ cardSlot.card.cardType.title }}</span>
          </template>
          <template v-else>
            <span class="text-grey-8">Slot {{ index + 1 }}</span>
          </template>
        </q-btn>
      </draggable>
      <div class="flex flex-center column">
        <q-btn push color="white" text-color="primary" round icon="arrow_right" size="xl" @click="startTurn" :disable="disableAct" />
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
    startTurn () {
      glos.game.match.startTurn()
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
    cardSlotToColor (cardSlot) {
      return cardSlot.card ? (cardSlot.active ? 'light-blue-6' : 'primary') : undefined
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
    cardSlots () {
      return this.glos.cardSlots // this.glos.game && this.glos.game.match && this.glos.game.match.playerSelf.bot.cardSlots
    },
    disableAct () {
      return glos.game.match && (glos.game.match.turnInProgress || !!glos.game.match.gameOver)
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
