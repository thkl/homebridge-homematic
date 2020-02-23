'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitKeyService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    let self = this
    this.switch = this.getService(Service.StatelessProgrammableSwitch)
    this.keyEvent = this.switch.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    this.label = this.switch.getCharacteristic(Characteristic.Name).on('get', function (callback) {
      callback(self.name)
    })
    this.isMultiChannel = false
  }

  datapointEvent (dp, newValue) {
    if (this.isDataPointEvent(dp, 'PRESS_SHORT')) {
      this.keyEvent.updateValue(0, null)
    }
    if (this.isDataPointEvent(dp, 'PRESS_LONG')) {
      this.keyEvent.updateValue(2, null)
    }
  }
}

module.exports = HomeMaticHomeKitKeyService
