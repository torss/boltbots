Math.nextPowerOfTwo = function (n) {
  if (n === 0) return 1
  --n
  n |= n >> 1
  n |= n >> 2
  n |= n >> 4
  n |= n >> 8
  n |= n >> 16
  return n + 1
}

// Math.nearestPowerOfTwo = function (n) {
//   return 1 << 31 - Math.clz32(n)
// }
