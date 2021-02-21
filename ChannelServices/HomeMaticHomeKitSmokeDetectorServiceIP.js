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
            if (callback) callback(null, 0) // SMOKE_NOT_DETECTED = 0;
            break
          case 1: // primary alarm
            if (callback) callback(null, 1) // SMOKE_DETECTED = 1;
            break
          case 2: // INTRUSION_ALARM
            if (callback) callback(null, 1) // SMOKE_DETECTED = 1;
            break
          case 3: // SECONDARY_ALARM only set if not a single signaling
            if (that.memyselfandi !== true) {
              if (callback) callback(null, 1) // SMOKE_DETECTED = 1;
            } else {
              if (callback) callback(null, 0)// SMOKE_NOT_DETECTED = 0;
            }
            break
          default:
            if (callback) callback(null, 0)// SMOKE_NOT_DETECTED = 0;
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
        this.state.updateValue(0, null)// SMOKE_NOT_DETECTED = 0;
        break
      case 1: // primary alarm
        this.state.updateValue(1, null)// SMOKE_DETECTED = 1;
        break
      case 2: // INTRUSION_ALARM
        this.state.updateValue(1, null)// SMOKE_DETECTED = 1;
        break
      case 3: // SECONDARY_ALARM only set if not a single signaling
        if (this.memyselfandi !== true) {
          this.state.updateValue(1, null)// SMOKE_DETECTED = 1;
        }
        break
    }
  }
}

module.exports = HomeMaticHomeKitSmokeDetectorServiceIP
