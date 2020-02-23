'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitLuxMeterService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this

    var lightSensor = this.getService(Service.LightSensor)

    this.cbright = lightSensor.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function (callback) {
        self.query('LUX', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.cbright.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('LUX'), this, function (newValue) {
      self.log.debug('[LMS] LUX event %s', newValue)
      self.cbright.updateValue(parseFloat(newValue), null)
    })
  }
}

module.exports = HomeMaticHomeKitLuxMeterService
