// See https://stackoverflow.com/a/4467559
// eslint-disable-next-line no-extend-native
Number.prototype.mod = function (n) {
  return ((this % n) + n) % n
}
