'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitThermometerService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitThermometerService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitThermometerService, HomeKitGenericService)

HomeMaticHomeKitThermometerService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.usecache = false
  var thermo = new Service.TemperatureSensor(this.name)
  this.services.push(thermo)
  // Enable log
  this.enableLoggingService('thermo')

  this.cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({
      minValue: -100
    })
    .on('get', function (callback) {
      this.remoteGetValue('TEMPERATURE', function (value) {
        that.addLogEntry({
          currentTemp: parseFloat(value)
        })
        if (callback) callback(null, value)
      })
    }.bind(this))

  this.setCurrentStateCharacteristic(this.channelnumber + ':TEMPERATURE', this.cctemp)
  this.eventEnabled = true
  this.log.debug('[HKTS] initial query')
  this.queryData()
}

HomeMaticHomeKitThermometerService.prototype.queryData = function () {
  var that = this
  this.log.debug('[HKTS] periodic measurement')
  this.removeCache('TEMPERATURE')
  this.query('TEMPERATURE', function (value) {
    that.addLogEntry({
      currentTemp: parseFloat(value)
    })
    that.datapointEvent('TEMPERATURE', value)
    // create timer to query device every 10 minutes
    that.refreshTimer = setTimeout(function () {
      that.queryData()
    }, 10 * 60 * 1000)
  })
}

HomeMaticHomeKitThermometerService.prototype.shutdown = function () {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitThermometerService.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'TEMPERATURE')) {
    this.log.debug('[HKTS] updateValue %s', newValue)
    this.cctemp.updateValue(parseFloat(newValue), null)
    this.addLogEntry({
      currentTemp: parseFloat(newValue)
    })
  }
}

module.exports = HomeMaticHomeKitThermometerService
