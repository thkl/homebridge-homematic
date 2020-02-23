'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitDimmerService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.lightbulb = this.getService(Service.Lightbulb)
    this.delayOnSet = 5
    this.ignoreWorking = true
    this.inhibitWhileWorking = false
    this.newLevel = 0
    this.isMultiChannel = false
    if (!this.dimmerLevelDatapoint) { this.dimmerLevelDatapoint = 'LEVEL' }
    if (!this.dimmerOldLevelDatapoint) { this.dimmerOldLevelDatapoint = 'OLD_LEVEL' }
    if (!this.workingDatapoint) { this.workingDatapoint = 'WORKING' }

    this.onc = this.lightbulb.getCharacteristic(Characteristic.On)

      .on('get', function (callback) {
        self.query(self.dimmerLevelDatapoint, function (value) {
          if (value === undefined) {
            value = 0
          }
          self.setCache('LAST', value)
          if (callback) callback(null, value > 0)
        })
      })

      .on('set', function (value, callback) {
        var lastLevel = self.getCache('LAST')
        if (lastLevel === undefined) {
          lastLevel = -1
        }
        if (((value === true) || ((value === 1))) && ((lastLevel < 1))) {
          self.command('set', self.dimmerOldLevelDatapoint, true)
          self.setCache('LAST', undefined)
        } else
        if ((value === 0) || (value === false)) {
          self.setCache('LAST', 0)
          self.setDimmerLevel(0)
        } else
        if (((value === true) || ((value === 1))) && ((lastLevel > 0))) {

        } else {
          self.setDimmerLevel(lastLevel)
        }
        callback()
      })

    this.onc.eventEnabled = true

    this.brightness = this.lightbulb.getCharacteristic(Characteristic.Brightness)
      .on('get', function (callback) {
        self.log.debug('[DIMMER] getCharacteristic Brightness')
        self.query(self.dimmerLevelDatapoint, function (value) {
          self.setCache('LAST', value)
          if (callback) {
            self.log.debug('[DIMMER] getCharacteristic Brightness is %s', value)
            callback(null, (value * 100))
          }
        })
      })

      .on('set', function (value, callback) {
        self.newLevel = value
        clearTimeout(self.timer)
        if (self.delayOnSet > 0) {
          self.timer = setTimeout(function () {
            self.setDimmerLevel(self.newLevel)
          }, (self.delayOnSet * 100))
        } else {
          self.setDimmerLevel(self.newLevel)
        }
        if (callback) callback()
      })

    this.brightness.eventEnabled = true
    var dpa = this.buildHomeMaticAddress(this.workingDatapoint)
    this.log.debug('[DIMMER] registeraddressForEventProcessingAtAccessory working %s', dpa)
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, this, function (newValue) {
      self.log.debug('[DIMMER] Working is %s', newValue)
      self.inhibitWhileWorking = newValue
      if (newValue === true) {
        self.triggerWorkingTimer()
      } else {
        self.removeCache(self.dimmerLevelDatapoint)
        self.remoteGetValue(self.dimmerLevelDatapoint, function (newValue) {
          self.processDimmerLevel(newValue)
        })
      }
    })

    dpa = this.buildHomeMaticAddress(this.dimmerLevelDatapoint)
    this.log.debug('[DIMMER] registeraddressForEventProcessingAtAccessory level %s', dpa)
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, this, function (newValue) {
      if (!self.inhibitWhileWorking) {
        self.processDimmerLevel(newValue)
      } else {
        self.log.debug('[DIMMER] is Working save new level %s', newValue)
      }
    })
  }

  triggerWorkingTimer () {
    let self = this
    clearTimeout(this.workingTimer)
    this.workingTimer = setTimeout(function () {
      // switch off working after one second
      // kill the cache and ask ccu for new level
      self.log.warn('[DIMMER] working timeout .. set HK values')
      self.inhibitWhileWorking = false
      self.removeCache(self.dimmerLevelDatapoint)
      self.remoteGetValue(self.dimmerLevelDatapoint, function (newValue) {
        self.processDimmerLevel(newValue)
      })
    }, 10000)
  }

  setDimmerLevel (value) {
    var lastLevel = this.getCache('LAST')
    if (value !== lastLevel) {
      this.inhibitWhileWorking = true
      if (value === 0) {
        // set On State
        if ((this.onc !== undefined) && (this.onc.updateValue !== undefined)) {
          this.onc.updateValue(false, null)
        }
      } else {
        if ((this.onc !== undefined) && (this.onc.updateValue !== undefined)) {
          this.onc.updateValue(true, null)
        }
      }
      this.log.debug('[DIMMER] Set Brightness of ' + this.address + ' to ' + value + ' command. LastLevel is ' + lastLevel)
      this.setCache('LAST', value)
      this.isWorking = true
      this.delayed('set', this.dimmerLevelDatapoint, (value / 100))
      this.triggerWorkingTimer()
    }
  }

  processDimmerLevel (newValue) {
    this.log.debug('[DIMMER] Set HomeKit Brightness of %s to %s', this.address, newValue)
    clearTimeout(this.workingTimer)
    this.brightness.updateValue((newValue * 100), null)
    this.onc.updateValue((newValue > 0), null)
  }
  shutdown () {
    this.log.debug('[DIMMER] shutdown')
    HomeKitGenericService.prototype.shutdown.call(this)
    clearTimeout(this.workingTimer)
    clearTimeout(this.timer)
  }
}
module.exports = HomeMaticHomeKitDimmerService
