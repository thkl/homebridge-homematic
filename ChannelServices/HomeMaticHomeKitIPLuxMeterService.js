'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitIPLuxMeterService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this

    var lightSensor = this.getService(Service.LightSensor)

    this.cbright = lightSensor.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function (callback) {
        self.query('CURRENT_ILLUMINATION', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.cbright.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('CURRENT_ILLUMINATION'), this, function (newValue) {
      self.log.debug('[IPLMS] CURRENT_ILLUMINATION event %s', newValue)
      self.cbright.updateValue(parseFloat(newValue), null)
    })
  }
}

module.exports = HomeMaticHomeKitIPLuxMeterService
