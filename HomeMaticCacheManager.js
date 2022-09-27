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
    return
  }

  cacheEntry = {}
  cacheEntry.value = value
  cacheEntry.timestamp = Date.now()
  this.log.debug('[Cache] write %s for %s', cacheEntry, address)
  this.cache[address] = cacheEntry
}

HomeMaticCacheManager.prototype.getValue = function (address) {
  let cv = this.cache[address]
  if (cv) {
  let age = Date.now() - cv.timestamp
  if ( age > 60000 ) {
    this.log.debug('[Cache] hit on %s %s - but outdated, ignoring', address, cv.value)
    return undefined
  }
    this.log.debug('[Cache] hit on %s %s', address, cv.value)
    return cv.value
  } else {
    this.log.debug('[Cache] fail on %s', address)
    return undefined
  }
}

HomeMaticCacheManager.prototype.deleteValue = function (address) {
  this.log.debug('[Cache] remove %s', address)
  delete this.cache[address]
}

module.exports = {
  HomeMaticCacheManager: HomeMaticCacheManager
}
