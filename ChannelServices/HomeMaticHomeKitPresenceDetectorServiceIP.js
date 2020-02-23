'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
class HomeMaticHomeKitPresenceDetectorServiceIP extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this

    this.enableLoggingService('motion')

    var sensor = this.getService(Service.MotionSensor)
    this.state = sensor.getCharacteristic(Characteristic.MotionDetected)
      .on('get', function (callback) {
        self.query('PRESENCE_DETECTION_STATE', function (value) {
          self.addLogEntry({ status: (value === true) ? 1 : 0 })
          if (callback) callback(null, value)
        })
      })

    this.state.eventEnabled = true

    var brightness = this.getService(Service.LightSensor)
    this.cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function (callback) {
        self.query('ILLUMINATION', function (value) {
          callback(null, value / 10)
        })
      })

    this.cbright.eventEnabled = true

    this.addTamperedCharacteristic(sensor, Characteristic)
    this.addLowBatCharacteristic(sensor, Characteristic)

    this.platform.registeraddressForEventProcessingAtAccessory(self.address + '.PRESENCE_DETECTION_STATE', self, function (newValue) {
      self.log.debug('[PDSIP] event for PRESENCE_DETECTION_STATE %s', newValue)
      self.addLogEntry({ status: (self.isTrue(newValue)) ? 1 : 0 })
      self.state.updateValue((self.isTrue(newValue)) ? 1 : 0, null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(self.address + '.ILLUMINATION', self, function (newValue) {
      self.log.debug('[PDSIP] event for ILLUMINATION %s', newValue)
      self.cbright.updateValue(parseFloat(newValue) / 10)
    })
  }
}

module.exports = HomeMaticHomeKitPresenceDetectorServiceIP
