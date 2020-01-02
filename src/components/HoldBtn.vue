<template>
  <q-circular-progress
    show-value class="hold-btn" font-size="0.5em"
    :value="progress" :max="1"
    @mousedown="start" @mouseleave="stop" @mouseup="stop" @touchstart="start" @touchend="stop" @touchcancel="stop"
    :center-color="error ? 'negative' : centerColor" :track-color="trackColor" :color="color"
    >
    <slot></slot>
  </q-circular-progress>
</template>

<script>
export default {
  name: 'HoldBtn',
  props: {
    error: {
      type: Boolean,
      default: false
    },
    incrementMs: {
      type: Number,
      default: 1500
    },
    decrementMs: {
      type: Number,
      default: 1000
    },
    intervalMs: {
      type: Number,
      default: 100
    },
    cooldownMs: {
      type: Number,
      default: 500
    },
    // q-circular-progress stuff:
    centerColor: {
      type: String,
      default: 'inset-1'
    },
    trackColor: {
      type: String,
      default: 'inset-2'
    },
    color: {
      type: String,
      default: 'white'
    }
  },
  data () {
    this.$intervalInc = undefined
    this.$intervalDec = undefined
    return {
      progress: 0
    }
  },
  methods: {
    start (event) {
      const accelerated = !!event.shiftKey
      if (!this.error && !this.$intervalInc) {
        this.clearIntervalDec()
        this.$intervalInc = setInterval(() => {
          const increment = accelerated ? this.incrementFast : this.increment
          this.progress = Math.min(this.progress + increment, 1)
          if (this.progress === 1) {
            this.clearIntervalInc(true)
            setTimeout(() => {
              this.$intervalInc = undefined
              this.progress = 0
              if (!this.error) this.$emit('trigger')
            }, this.cooldownMs)
          }
        }, this.intervalMs)
      }
    },
    stop () {
      this.clearIntervalInc()
      if (!this.$intervalDec) {
        this.$intervalDec = setInterval(() => {
          this.progress = Math.max(this.progress - this.decrement, 0)
          if (this.progress === 0) this.clearIntervalDec()
        }, this.intervalMs)
      }
    },
    clearIntervalInc (intervalIncNew = undefined) {
      clearInterval(this.$intervalInc)
      this.$intervalInc = intervalIncNew
    },
    clearIntervalDec () {
      clearInterval(this.$intervalDec)
      this.$intervalDec = undefined
    }
  },
  computed: {
    incrementFast () {
      return this.intervalMs / 250
    },
    increment () {
      return this.intervalMs / this.incrementMs
    },
    decrement () {
      return this.intervalMs / this.decrementMs
    }
  }
}
</script>

<style lang="stylus" scoped>
.hold-btn
  user-select none
  cursor pointer
  transition all 0.5s ease-in-out
  opacity 0.5
  &:hover
    opacity 1
</style>
