'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitSensorService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this

    this.enableLoggingService('door')

    if (this.special === 'DOOR') {
      var door = this.getService(Service.Door)
      this.cDoor = door.getCharacteristic(Characteristic.CurrentDoorState)

      this.cDoor.on('get', function (callback) {
        self.query('SENSOR', function (value) {
          self.addLogEntry({ status: self.isTrue(value) ? 1 : 0 })
          if (callback) callback(null, value)
        })
      })

      this.cDoor.eventEnabled = true
    } else {
      var contact = this.getService(Service.ContactSensor)
      this.cContact = contact.getCharacteristic(Characteristic.ContactSensorState)
        .on('get', function (callback) {
          self.query('SENSOR', function (value) {
            self.addLogEntry({ status: self.isTrue(value) ? 1 : 0 })
            callback(null, value)
          })
        })
      this.cContact.eventEnabled = true
    }

    let dpa = this.transformDatapoint('SENSOR')
    this.platform.registeraddressForEventProcessingAtAccessory(dpa, self, function (newValue) {
      self.log.debug('[Sensor] event %s', newValue)
      self.addLogEntry({ status: self.isTrue(newValue) ? 1 : 0 })
      if (self.cContact) {
        self.cContact.updateValue(self.isTrue(newValue) ? 1 : 0, null)
      }
      if (self.cDoor) {
        self.cDoor.updateValue(self.isTrue(newValue) ? 1 : 0, null)
      }
    })
  }
}

module.exports = HomeMaticHomeKitSensorService
