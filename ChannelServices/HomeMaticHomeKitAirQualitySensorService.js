'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitAirQualitySensorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitAirQualitySensorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitAirQualitySensorService, HomeKitGenericService)

HomeMaticHomeKitAirQualitySensorService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var carbondioxideSensor = new Service['CarbonDioxideSensor'](this.name)
  var state = carbondioxideSensor.getCharacteristic(Characteristic.CarbonDioxideDetected)
    .on('get', function (callback) {
      that.query('STATE', function (value) {
        if (callback) callback(null, value)
      })
    })

  this.addValueMapping('STATE', 0, 0)
  this.addValueMapping('STATE', 1, 1)
  this.addValueMapping('STATE', 2, 1)

  this.currentStateCharacteristic['STATE'] = state
  state.eventEnabled = true
  this.services.push(carbondioxideSensor)
  this.remoteGetValue('STATE')
}

module.exports = HomeMaticHomeKitAirQualitySensorService
