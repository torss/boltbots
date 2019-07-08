import Random from 'rng.js'

function choose (size) {
  return Math.floor(this.nextNumber() * size)
}

function chooseFrom (options) {
  return options[this.choose(options.length)]
}

Random.prototype.choose = choose
Random.prototype.chooseFrom = chooseFrom

export const Rng = Random
