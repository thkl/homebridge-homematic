'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
class HomeMaticHomeKitSmokeDetectorServiceIP extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    let self = this
    var sensor = this.getService(Service.SmokeSensor)
    this.memyselfandi = this.getClazzConfigValue('single_alarm', false)

    this.state = sensor.getCharacteristic(Characteristic.SmokeDetected)
      .on('get', function (callback) {
        self.query('SMOKE_DETECTOR_ALARM_STATUS', function (value) {
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
            case 3: // SECONDARY_ALARM only set if not a single signaling
              if (self.memyselfandi !== true) {
                if (callback) callback(null, true)
              } else {
                if (callback) callback(null, false)
              }
              break
            default:
              if (callback) callback(null, false)
              break
          }
        })
      })

    let dpa = this.buildHomeMaticAddress('1.SMOKE_DETECTOR_ALARM_STATUS')
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, self, function (newValue) {
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
        case 3: // SECONDARY_ALARM only set if not a single signaling
          if (this.memyselfandi !== true) {
            this.state.updateValue(true, null)
          }
          break
      }
    })
  }
}
module.exports = HomeMaticHomeKitSmokeDetectorServiceIP
