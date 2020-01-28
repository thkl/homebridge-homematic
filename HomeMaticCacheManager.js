// ToDo Time based cache

function HomeMaticCacheManager (log) {
  this.log = log
  this.log.debug('[Cache] initalizing')
  this.clearAll()
}

HomeMaticCacheManager.prototype.clearAll = function () {
  this.cache = {}
  this.log.debug('[Cache] cleared')
}

HomeMaticCacheManager.prototype.doCache = function (address, value) {
  // sanity check
  var parts = address.split(':')
  if (parts.length !== 2) {
    return
  }

  parts = address.split('.')
  if (parts.length !== 3) {
    throw new Error('address missmatch ' + address)
  }

  this.log.debug('[Cache] write %s for %s', value, address)
  this.cache[address] = value
}

HomeMaticCacheManager.prototype.getValue = function (address) {
  let cv = this.cache[address]
  if (cv) {
    this.log.debug('[Cache] hit on %s %s', address, cv)
    return cv
  } else {
    this.log.debug('[Cache] fail on %s', address)
    return undefined
  }
}

HomeMaticCacheManager.prototype.deleteValue = function (address) {
  delete this.cache[address]
}

module.exports = {
  HomeMaticCacheManager: HomeMaticCacheManager
}
