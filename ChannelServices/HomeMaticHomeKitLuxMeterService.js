'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitLuxMeterService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitLuxMeterService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitLuxMeterService, HomeKitGenericService)

HomeMaticHomeKitLuxMeterService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  
  var lightSensor = new Service.LightSensor(this.name)
  this.services.push(lightSensor)

  this.cbright = lightSensor.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
    .on('get', function (callback) {
      that.query('LUX', function (value) {
        if (callback) callback(null, value)
      })
    })
    
  this.setCurrentStateCharacteristic('LUX', this.cbright)
  this.cbright.eventEnabled = true
  
}

HomeMaticHomeKitLuxMeterService.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'LUX')) {
    this.cbright.updateValue(parseFloat(newValue), null)
  }
}

module.exports = HomeMaticHomeKitLuxMeterService
