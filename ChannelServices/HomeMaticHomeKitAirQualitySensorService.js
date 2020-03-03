'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitAirQualitySensorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var carbondioxideSensor = this.getService(Service.CarbonDioxideSensor)
    this.state = carbondioxideSensor.getCharacteristic(Characteristic.CarbonDioxideDetected)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.addHomeMaticDatapoint('STATE')

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('STATE'), this, function (newValue) {
      self.log.debug('[AKS] State event %s', newValue)
      var hkresult = 0
      switch (newValue) {
        case 1:
          hkresult = 1
          break
        case 2:
          hkresult = 1
          break
      }
      self.state.updateValue(hkresult, null)
    })
  }
}

module.exports = HomeMaticHomeKitAirQualitySensorService
