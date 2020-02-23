'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitCarbonDioxideSensorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var co2sensor = this.getService(Service.CarbonDioxideSensor)

    this.co2level = co2sensor.getCharacteristic(Characteristic.CarbonDioxideDetected)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          self.log.debug('[CO2] get result is %s (%s)', value, typeof value)
          var result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
          switch (value) {
            case 0:
              result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
              break
            case 1:
              result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
              break
            case 2:
              result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
              break
          }
          if (callback) callback(null, result)
        })
      })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('STATE'), this, function (newValue) {
      self.log.debug('[CO2] remote Event with %s', newValue)
      self.processState(newValue)
    })
  }

  processState (value) {
    switch (value) {
      case 0:
        this.co2level.updateValue(0, null)
        break
      case 1:
        this.co2level.updateValue(0, null)
        break
      case 2:
        this.co2level.updateValue(1, null)
        break
      default:
        this.co2level.updateValue(1, null)
        break
    }
  }
}

module.exports = HomeMaticHomeKitCarbonDioxideSensorService
