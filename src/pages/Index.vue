<template>
  <q-page class="page flex flex-row">
    <div class="canvas-container">
      <q-resize-observable @resize="onResize" />
      <canvas ref="canvas" class="canvas" @mousemove="onMousemove" @mousedown="onMousedown" />
    </div>
  </q-page>
</template>

<script>
import {init} from '../internal/Init'

export default {
  name: 'PageIndex',
  mounted () {
    init(this)
    document.addEventListener('wheel', this.onWheel)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy () {
    document.removeEventListener('wheel', this.onWheel)
    document.removeEventListener('keydown', this.onKeydown)
    this.$deinit()
  },
  methods: {
    onResize (size) {
      if (this.$resize) this.$resize(size)
    },
    onMousemove (event) {
      if (this.$onMousemove) this.$onMousemove(event)
    },
    onMousedown (event) {
      if (this.$onMousedown) this.$onMousedown(event)
    },
    onWheel (event) {
      if (this.$onWheel) this.$onWheel(event)
    },
    onKeydown (event) {
      if (this.$onKeydown) this.$onKeydown(event)
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
