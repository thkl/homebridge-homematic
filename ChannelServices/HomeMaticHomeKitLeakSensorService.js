'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitLeakSensorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var leakSensor = this.getService(Service.LeakSensor)
    this.state = leakSensor.getCharacteristic(Characteristic.LeakDetected)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.state.eventEnabled = true
    // this.addHomeMaticDatapoint('STATE')

    this.platform.registeraddressForEventProcessingAtAccessory(this.address + '.STATE', this, function (newValue) {
      self.log.debug('[LSS] Leak State event %s', newValue)
      if ((self.isTrue(newValue)) || (newValue === 2)) {
        self.state.updateValue(1, null)
      } else {
        self.state.updateValue(0, null)
      }
    })
  }
}

module.exports = HomeMaticHomeKitLeakSensorService
