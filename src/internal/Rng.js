import Random from 'rng.js'

export class Rng extends Random {
  choose (size) {
    return Math.floor(this.nextNumber() * size)
  }

  chooseFrom (options) {
    return options[this.choose(options.length)]
  }

  clone () {
    return new Rng(this.lowSeed, this.highSeed)
  }
}

// function choose (size) {
//   return Math.floor(this.nextNumber() * size)
// }

// function chooseFrom (options) {
//   return options[this.choose(options.length)]
// }

// Random.prototype.choose = choose
// Random.prototype.chooseFrom = chooseFrom

// export const Rng = Random
