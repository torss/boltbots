<template>
  <div class="footer flex row" @mousedown="stopEvent">
    <!-- <q-card dark class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :flat="!cardSlot.card">
    <template v-if="cardSlot.card">
      <span>{{ cardSlot.card.cardType.title }}</span>
    </template>
    </q-card> -->
    <q-btn class="card flex flex-center column" v-for="(cardSlot, index) in cardSlots" :key="index" :push="!!cardSlot.card" :color="cardSlot.card ? 'primary' : undefined" :rounded="true" no-caps>
      <template v-if="cardSlot.card">
        <span>{{ cardSlot.card.cardType.title }}</span>
      </template>
    </q-btn>
    <div class="flex flex-center column">
      <q-btn push color="white" text-color="primary" round icon="arrow_right" size="xl" @click="endTurn" />
    </div>
  </div>
</template>

<script>
import { glos } from '../internal/Glos'
import { Match, Player, CardSlot, Card, CardType } from '../internal/game'

export default {
  name: 'CtrlFooter',
  data () {
    const match = new Match()
    const player = new Player()
    glos.game.match = match
    match.playerSelf = player
    for (let i = 0; i < 5; ++i) {
      const cardType = new CardType('Forward ' + i)
      const card = new Card(cardType)
      const cardSlot = new CardSlot()
      if (i < 3) cardSlot.card = card
      player.cardSlots.push(cardSlot)
    }
    return {
      cardSlots: player.cardSlots
    }
  },
  methods: {
    stopEvent (event) {
      event.stopPropagation()
      event.preventDefault()
    },
    endTurn () {
      console.log('TEST')
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
