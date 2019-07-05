<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          @click="leftDrawerOpen = !leftDrawerOpen"
          aria-label="Menu"
        >
          <q-icon name="menu" />
        </q-btn>

        <q-toolbar-title>
          Bolt Bots
          <q-tooltip>Running on Quasar v{{ $q.version }}</q-tooltip>
        </q-toolbar-title>
        <div class="toolbarStats" ref="toolbarStats" />
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      content-class="bg-grey-2"
    >
      <q-list>
        <div class="flex flex-center">
          <img class="logo" alt="Bolt Bots logo" src="~assets/boltbots-logo.svg">
        </div>
        <q-item-label header>Hand</q-item-label>
        <q-list class="q-gutter-sm" @mousedown="onMousedown">
          <draggable class="card-slots q-gutter-sm justify-center row" :list="hand" group="hand" @end="onMouseup">
              <q-btn v-for="(card, index) in hand" :key="index" class="card" push color="primary" no-caps draggable="true" @dragstart="dragCard(card)">
                <span>{{ card.cardType.title }}</span>
              </q-btn>
          </draggable>
        </q-list>
        <q-item-label header>Essential Links</q-item-label>
        <q-item clickable tag="a" target="_blank" href="http://v1.quasar-framework.org">
          <q-item-section avatar>
            <q-icon name="school" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Docs</q-item-label>
            <q-item-label caption>v1.quasar-framework.org</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://github.com/quasarframework/">
          <q-item-section avatar>
            <q-icon name="code" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Github</q-item-label>
            <q-item-label caption>github.com/quasarframework</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="http://chat.quasar-framework.org">
          <q-item-section avatar>
            <q-icon name="chat" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Discord Chat Channel</q-item-label>
            <q-item-label caption>chat.quasar-framework.org</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://forum.quasar-framework.org">
          <q-item-section avatar>
            <q-icon name="record_voice_over" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Forum</q-item-label>
            <q-item-label caption>forum.quasar-framework.org</q-item-label>
          </q-item-section>
        </q-item>
        <q-item clickable tag="a" target="_blank" href="https://twitter.com/quasarframework">
          <q-item-section avatar>
            <q-icon name="rss_feed" />
          </q-item-section>
          <q-item-section>
            <q-item-label>Twitter</q-item-label>
            <q-item-label caption>@quasarframework</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
import { openURL } from 'quasar'
import draggable from 'vuedraggable'
import { glos } from '../internal/Glos'

export default {
  name: 'MyLayout',
  components: {
    draggable
  },
  data () {
    return {
      leftDrawerOpen: this.$q.platform.is.desktop,
      vueGlos: glos.vueGlos
    }
  },
  methods: {
    openURL,
    dragCard (card) {
      glos.dragged = card
    },
    onMousedown () {
      if (glos.threejsControls) glos.threejsControls.enabled = false
      document.addEventListener('mouseup', () => this.onMouseup(), { once: true })
    },
    onMouseup () {
      if (glos.threejsControls) glos.threejsControls.enabled = true
    }
  },
  computed: {
    hand () {
      return this.vueGlos.hand
    }
  }
}
</script>

<style lang="stylus" scoped>
.logo
  width 50%

.toolbarStats
  float right
</style>
