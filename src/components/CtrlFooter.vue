<template>
  <div class="footer flex row" @mousedown="onMousedown">
    <!-- <q-card dark class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :flat="!cardSlot.card">
    <template v-if="cardSlot.card">
      <span>{{ cardSlot.card.cardType.title }}</span>
    </template>
    </q-card> -->

    <draggable class="flex row" :list="cardSlots" group="cards" :move="checkCardMove" @end="onMouseup">
      <q-btn class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :push="!!cardSlot.card" :color="cardSlot.card ? 'primary' : undefined" :rounded="true" no-caps>
        <template v-if="cardSlot.card">
          <span>{{ cardSlot.card.cardType.title }}</span>
        </template>
      </q-btn>
    </draggable>
    <div class="flex flex-center column">
      <q-btn push color="white" text-color="primary" round icon="arrow_right" size="xl" @click="endTurn" />
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { glos } from '../internal/Glos'

export default {
  name: 'CtrlFooter',
  components: {
    draggable
  },
  data () {
    return {
      vueGlos: glos.vueGlos
    }
  },
  methods: {
    stopEvent (event) {
      event.stopPropagation()
      event.preventDefault()
    },
    endTurn () {
      console.log('TEST endTurn')
      glos.game.nextTurn()
    },
    onMousedown () {
      if (glos.threejsControls) glos.threejsControls.enabled = false
      document.addEventListener('mouseup', () => this.onMouseup(), { once: true })
    },
    onMouseup () {
      if (glos.threejsControls) glos.threejsControls.enabled = true
    },
    checkCardMove (event) {
      if (!event.draggedContext.element.card) return false
      if (!event.relatedContext.element.card) return false
    }
  },
  computed: {
    cardSlots () {
      return this.vueGlos.cardSlots
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

.card
  background-color rgba(16, 16, 16, 0.75)
  width 10em
  margin 1em
</style>
