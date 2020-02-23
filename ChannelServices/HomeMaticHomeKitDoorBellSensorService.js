'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitDoorBellSensorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var doorbellSensor = this.getService(Service.Doorbell)
    var state = doorbellSensor.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
      .on('get', function (callback) {
        if (callback) callback(null, false)
      })

    this.currentStateCharacteristic['PRESS_SHORT'] = state
    state.eventEnabled = true
  }
}

module.exports = HomeMaticHomeKitDoorBellSensorService
