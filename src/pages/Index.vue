<template>
  <q-page class="flex flex-center">
    <q-resize-observable @resize="onResize" />
    <canvas ref="canvas" />
  </q-page>
</template>

<style>
</style>

<script>
import {init} from '../internal/Init'

export default {
  name: 'PageIndex',
  mounted () {
    init(this)
  },
  beforeDestroy () {
    this.$deinit()
  },
  methods: {
    onResize (size) {
      if (this.$resize) this.$resize(size)
    }
  }
}
</script>

<style lang="stylus" scoped>
</style>
