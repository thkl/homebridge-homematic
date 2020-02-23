'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const sprintf = require('sprintf-js').sprintf

class HomeMaticHomeKitBatterySystemService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var trigger = this.getClazzConfigValue('trigger', undefined)
    this.variable = this.getClazzConfigValue('variable', undefined)
    this.level = 100

    if ((trigger !== undefined) && (this.variable !== undefined)) {
      this.log.debug('Initialize variable based BatterySystemService on %s with trigger %s', this.variable, trigger)
      var batsys = this.getService(Service.BatteryService)

      this.currentlevel = batsys.getCharacteristic(Characteristic.BatteryLevel)
        .on('set', function (value, callback) {
          if (callback) callback()
        })
        .on('get', function (callback) {
          if (callback) {
            callback(null, self.level)
          }
        })

      this.chargingState = batsys.getCharacteristic(Characteristic.ChargingState)
        .on('get', function (callback) {
          if (callback) {
            callback(null, 0)
          }
        })

      this.lowLevelState = batsys.getCharacteristic(Characteristic.StatusLowBattery)
        .on('get', function (callback) {
          if (callback) {
            callback(null, 0)
          }
        })

      // register for events at the trigger
      this.platform.registeraddressForEventProcessingAtAccessory(trigger, this, function (newValue) {
        // just reload the variable
        self.reloadState()
      })
    } else {
      this.log.warn('cannot initialize variable based BatterySystemService trigger and/or variable missed in config')
    }
  }

  reloadState () {
    let self = this
    let script = sprintf("Write(dom.GetObject('%s').State());", this.variable)
    this.command('sendregacommand', '', script, function (result) {
      self.level = result
      self.log.debug('Level is %s', self.level)
      self.currentlevel.updateValue(self.level, null)
    })
  }
}
module.exports = HomeMaticHomeKitBatterySystemService
