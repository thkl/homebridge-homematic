'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const util = require('util')

class HomeMaticHomeKitRaindetectorService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    var uuid = homebridge.uuid

    Characteristic.IsRainingCharacteristic = function () {
      var charUUID = uuid.generate('HomeMatic:customchar:IsRainingCharacteristic')
      Characteristic.call(this, 'Regen', charUUID)
      this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      })
      this.value = this.getDefaultValue()
    }

    util.inherits(Characteristic.IsRainingCharacteristic, Characteristic)

    Service.IsRainingService = function (displayName, subtype) {
      var servUUID = uuid.generate('HomeMatic:customchar:IsRainingService')
      Service.call(this, displayName, servUUID, subtype)
      this.addCharacteristic(Characteristic.IsRainingCharacteristic)
    }

    util.inherits(Service.IsRainingService, Service)
  }

  createDeviceService (Service, Characteristic) {
    var self = this
    var rain = this.getService(Service.IsRainingService)
    this.crain = rain.getCharacteristic(Characteristic.IsRainingCharacteristic)
      .on('get', function (callback) {
        self.query('STATE', function (value) {
          if (callback) callback(null, value)
        })
      })

    this.crain.eventEnabled = true
    this.platform.registeraddressForEventProcessingAtAccessory(self.address + '.STATE', self, function (newValue) {
      self.crain.updateValue(self.isTrue(newValue) ? 1 : 0, null)
    })
  }
}

module.exports = HomeMaticHomeKitRaindetectorService
