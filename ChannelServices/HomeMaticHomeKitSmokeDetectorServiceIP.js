'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitSmokeDetectorServiceIP (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitSmokeDetectorServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitSmokeDetectorServiceIP, HomeKitGenericService)

HomeMaticHomeKitSmokeDetectorServiceIP.prototype.createDeviceService = function (Service, Characteristic) {
  let that = this
  var sensor = new Service.SmokeSensor(this.name)
  this.memyselfandi = this.getClazzConfigValue('single_alarm', false)

  this.state = sensor.getCharacteristic(Characteristic.SmokeDetected)
    .on('get', function (callback) {
      that.query('SMOKE_DETECTOR_ALARM_STATUS', function (value) {
      // https://github.com/thkl/homebridge-homematic/issues/215
      // https://github.com/thkl/homebridge-homematic/issues/229
        switch (value) {
          case 0: // idle
            if (callback) callback(null, false)
            break
          case 1: // primary alarm
            if (callback) callback(null, true)
            break
          case 2: // INTRUSION_ALARM
            if (callback) callback(null, true)
            break
          case 3 : // SECONDARY_ALARM only set if not a single signaling
            if (that.memyselfandi !== true) {
              if (callback) callback(null, true)
            } else {
              if (callback) callback(null, false)
            }
            break
        }
      })
    })

  this.services.push(sensor)
  this.remoteGetValue('SMOKE_DETECTOR_ALARM_STATUS')
  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':1.SMOKE_DETECTOR_ALARM_STATUS', this)
}

HomeMaticHomeKitSmokeDetectorServiceIP.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'SMOKE_DETECTOR_ALARM_STATUS')) {
    switch (newValue) {
      case 0: // idle
        this.state.updateValue(false, null)
        break
      case 1: // primary alarm
        this.state.updateValue(true, null)
        break
      case 2: // INTRUSION_ALARM
        this.state.updateValue(true, null)
        break
      case 3 : // SECONDARY_ALARM only set if not a single signaling
        if (this.memyselfandi !== true) {
          this.state.updateValue(true, null)
        }
        break
    }
  }
}

module.exports = HomeMaticHomeKitSmokeDetectorServiceIP
