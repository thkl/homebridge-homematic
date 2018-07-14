'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitCuxDThermostatService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitCuxDThermostatService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitCuxDThermostatService, HomeKitGenericService)

HomeMaticHomeKitCuxDThermostatService.prototype.createDeviceService = function (Service, Characteristic) {
  this.usecache = false
  var thermo = new Service.TemperatureSensor(this.name)
  this.services.push(thermo)

  var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({ minValue: -100 })
    .on('get', function (callback) {
      this.remoteGetValue('TEMPERATURE', function (value) {
        if (callback) callback(null, value)
      })
    }.bind(this))

  this.setCurrentStateCharacteristic('TEMPERATURE', cctemp)
  cctemp.eventEnabled = true

  var cchum = thermo.addCharacteristic(Characteristic.CurrentRelativeHumidity)
    .on('get', function (callback) {
      this.remoteGetValue('HUMIDITY', function (value) {
        if (callback) callback(null, value)
      })
    }.bind(this))

  this.setCurrentStateCharacteristic('HUMIDITY', cchum)
  cchum.eventEnabled = true

  this.remoteGetValue('TEMPERATURE')
  this.remoteGetValue('HUMIDITY')
}

module.exports = HomeMaticHomeKitCuxDThermostatService
