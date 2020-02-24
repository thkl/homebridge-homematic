'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitMotionDetectorServiceIP extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.historyEnabled = this.getClazzConfigValue('enable_history', false)

    if (this.historyEnabled === true) {
      this.enableLoggingService('motion')
    }

    var sensor = this.getService(Service.MotionSensor)
    this.cMotion = sensor.getCharacteristic(Characteristic.MotionDetected)
      .on('get', function (callback) {
        self.query('MOTION', function (value) {
          if ((self.historyEnabled === true) && (self.loggingService)) {
            self.addLogEntry({
              status: (value === true) ? 1 : 0
            })
          }
          if (callback) callback(null, value)
        })
      })

    this.cMotion.eventEnabled = true
    this.services.push(sensor)
    this.remoteGetValue('MOTION')

    if (this.deviceType !== 'HmIP-SAM') {
      var brightness = this.getService(Service.LightSensor)
      this.cBrightness = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
        .on('get', function (callback) {
          self.query('ILLUMINATION', function (value) {
            callback(null, value)
          })
        })

      // Change max Lux to 100

      this.cBrightness.setProps({
        format: Characteristic.Formats.FLOAT,
        unit: Characteristic.Units.LUX,
        maxValue: 100,
        minValue: 0.0001,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })

      this.cBrightness.eventEnabled = true
    }

    this.addTamperedCharacteristic(sensor, Characteristic)
    this.addLowBatCharacteristic(sensor, Characteristic)

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('MOTION'), this, function (newValue) {
      self.log.debug('[MSIP] MOTION event %s', newValue)
      let status = (newValue === true) ? 1 : 0
      if ((self.historyEnabled === true) && (self.loggingService)) {
        self.addLogEntry({
          status: status
        })
      }
      self.log.debug('[MDSIP] Motion: %s', newValue)
      self.cMotion.updateValue(newValue, null)
    })

    if (this.cBrightness) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('ILLUMINATION'), this, function (newValue) {
        self.log.debug('[MSIP] ILLUMINATION event %s', newValue)
        if (self.cBrightness) {
          self.cBrightness.updateValue(parseFloat(newValue), null)
        }
      })
    }
  }

  validateConfig (configuration) {
    // things to check
    return ((configuration) &&
    (configuration.enable_history) &&
    ([true, false].indexOf(configuration.enable_history) > -1)
    )
  }

  configItems () {
    return ['enable_history']
  }
}

module.exports = HomeMaticHomeKitMotionDetectorServiceIP
