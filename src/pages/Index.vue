<template>
  <q-page class="page flex flex-row">
    <div class="canvas-container">
      <q-resize-observable @resize="onResize" />
      <canvas ref="canvas" class="canvas" />
    </div>
  </q-page>
</template>

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
.page
  overflow hidden

.canvas
  position absolute

.canvas-container
  flex-grow 1
</style>
