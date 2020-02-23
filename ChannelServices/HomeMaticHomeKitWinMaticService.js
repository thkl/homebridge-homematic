'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitWinMaticService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var that = this
    this.shouldLock = false
    var window = this.getService(Service.Window)
    this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition)

    this.cwindow.on('get', function (callback) {
      that.query('LEVEL', function (value) {
        if (value < 0) {
          value = 0
        }
        if (callback) callback(null, value)
      })
    })

    this.setCurrentStateCharacteristic('LEVEL', this.cwindow)
    this.cwindow.eventEnabled = true

    this.swindow = window.getCharacteristic(Characteristic.TargetPosition)

    this.swindow.on('set', function (value, callback) {
      if (value === 0) {
        // Lock Window on Close Event
        that.log.info('[WinMatic] set to 0 -> should lock')
        that.shouldLock = true
      }
      that.command('setrega', 'SPEED', 1)
      that.delayed('set', 'LEVEL', value)
      callback()
    })

    this.wpos = window.getCharacteristic(Characteristic.PositionState)

    this.wpos.on('get', function (callback) {
      that.query('DIRECTION', function (value) {
        var hcvalue = 0
        hcvalue = value
        // may there are some mappings needed

        // D = 0
        // i = 1
        // s = 2

        if (callback) callback(null, hcvalue)
      })
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('LEVEL'), this, function (newValue) {
      let value = parseFloat(newValue)
      if (value === -0.005) {
        value = 0
      }
      that.cwindow.updateValue(value, null)
      that.swindow.updateValue(value, null)
      that.wpos.updateValue(2, null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('WORKING'), this, function (newValue) {
      if (!that.isTrue(newValue)) {
        that.log.info('[WinMatic] End Working')

        if (that.shouldLock === true) {
          that.log.debug('[WinMatic] ShouldLock is set -> send -0.005')
          that.command('setrega', 'SPEED', 1)
          that.delayed('set', 'LEVEL', -0.5) // The core is dividing by 100 so to set -0.005 we have to set -0.5 ...
        }

        that.shouldLock = false
        that.removeCache('LEVEL')
        that.remoteGetValue('LEVEL')
      }
    })
  }
}

module.exports = HomeMaticHomeKitWinMaticService
