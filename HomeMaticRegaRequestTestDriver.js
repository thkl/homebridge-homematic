var isInTest = typeof global.it === 'function'

function HomeMaticRegaRequestTestDriver(log, ccuip) {
  this.log = log
  this.ccuIP = ccuip
  this.timeout = 120
  this.data = 0
  if (!isInTest) {
    this.log.warn('[Rega TestDriver] Rega Dummy Class for Tests only it looks like i am running in production mode.')
  }
}

HomeMaticRegaRequestTestDriver.prototype = {

  script: function (script, callback) {
    if (this.platform.homebridge !== undefined) {
      this.platform.homebridge.values['lastScript'] = script
    }
    callback()
  },

  getValue: function (hmadr, callback) {
    if (this.platform.homebridge !== undefined) {
      this.log.debug('[Rega TestDriver] Rega Query %s', hmadr.address())
      if (callback !== undefined) {
        callback(this.platform.homebridge.getCCUDummyValue(hmadr.address()))
      }
    } else {
      let result = 0
      callback(result)
    }
  },

  setValue: function (hmadr, value) {
    this.log.debug('[Rega TestDriver] Set Rega Called %s - %s', hmadr.address(), value)
    if (this.platform.homebridge !== undefined) {
      if (typeof value === 'object') {
        value = value['explicitDouble']
      }

      this.platform.homebridge.setCCUDummyValue(hmadr.address(), value)
    }
  },

  setVariable: function (channel, value) { },

  getVariable: function (channel, callback) {
    this.log.warn('[Rega TestDriver] getback %s', this.data)
    callback(this.data)
  },

  isInt: function (n) {
    return Number(n) === n && n % 1 === 0
  },

  isFloat: function (n) {
    return n === Number(n) && n % 1 !== 0
  }

}

module.exports = {
  HomeMaticRegaRequestTestDriver: HomeMaticRegaRequestTestDriver
}
