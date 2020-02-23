'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitSmokeDetectorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var sensor = this.getService(Service.SmokeSensor)
    this.detectorstate = sensor.getCharacteristic(Characteristic.SmokeDetected)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (callback) callback(null, value)
        })
      })
    this.detectorstate.eventEnabled = true

    let dpa = this.transformDatapoint('STATE')
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, self, function (newValue) {
      self.log.debug('[SDS] event %s', newValue)
      self.detectorstate.updateValue(self.isTrue(newValue), null)
    })
  }
}

module.exports = HomeMaticHomeKitSmokeDetectorService
