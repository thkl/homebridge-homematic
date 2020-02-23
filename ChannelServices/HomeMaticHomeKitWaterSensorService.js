'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitWaterSensorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var that = this
    var leakSensor = this.getService(Service.LeakSensor)

    this.state = leakSensor.getCharacteristic(Characteristic.LeakDetected)
      .on('get', function (callback) {
        that.query('ALARMSTATE', function (value) {
          if (callback) callback(null, value)
        })
      })
    this.state.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('ALARMSTATE'), this, function (newValue) {
      that.state.updateValue(that.isTrue(newValue) ? 1 : 0)
    })
  }
}

module.exports = HomeMaticHomeKitWaterSensorService
