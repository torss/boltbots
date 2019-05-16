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
  created () {
    this.$deinit = []
    this.$onResize = []
    this.$onMousemove = []
    this.$onMousedown = []
    this.$onWheel = []
    this.$onKeydown = []
  },
  mounted () {
    init(this)
    document.addEventListener('wheel', this.onWheel, true)
    document.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy () {
    document.removeEventListener('wheel', this.onWheel, true)
    document.removeEventListener('keydown', this.onKeydown)
    this.$deinit.forEach(func => func())
  },
  methods: {
    onResize (size) {
      this.$onResize.forEach(func => func(size))
    },
    onMousemove (event) {
      this.$onMousemove.forEach(func => func(event))
    },
    onMousedown (event) {
      this.$onMousedown.forEach(func => func(event))
    },
    onWheel (event) {
      this.$onWheel.forEach(func => func(event))
    },
    onKeydown (event) {
      this.$onKeydown.forEach(func => func(event))
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
