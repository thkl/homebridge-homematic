'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitDoorBellSensorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitDoorBellSensorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitDoorBellSensorService, HomeKitGenericService)

HomeMaticHomeKitDoorBellSensorService.prototype.createDeviceService = function (Service, Characteristic) {
  var doorbellSensor = new Service['Doorbell'](this.name)
  var state = doorbellSensor.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
    .on('get', function (callback) {
      if (callback) callback(null, false)
    })

  this.currentStateCharacteristic['PRESS_SHORT'] = state
  state.eventEnabled = true
  this.services.push(doorbellSensor)
}

module.exports = HomeMaticHomeKitDoorBellSensorService
