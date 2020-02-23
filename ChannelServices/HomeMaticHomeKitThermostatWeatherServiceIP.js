'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitThermostatWeatherServiceIP extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    var thermo = this.getService(Service.TemperatureSensor)
    this.enableLoggingService('weather')
    this.currentTemperature = -255
    this.currentHumidity = -255

    this.ctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -100 })
      .on('get', function (callback) {
        self.query('ACTUAL_TEMPERATURE', function (value) {
          self.currentTemperature = parseFloat(value)
          if (callback) callback(null, value)
        })
      })

    this.ctemp.eventEnabled = true

    var humidity = this.getService(Service.HumiditySensor)
    this.chum = humidity.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', function (callback) {
        self.query('HUMIDITY', function (value) {
          self.currentHumidity = parseFloat(value)
          if (callback) callback(null, value)
        })
      })

    this.chum.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('ACTUAL_TEMPERATURE'), this, function (newValue) {
      self.currentTemperature = parseFloat(newValue)
      self.ctemp.updateValue(parseFloat(newValue), null)
      if ((self.currentTemperature > -255) && (self.currentHumidity > -255)) {
        self.addLogEntry({ temp: self.currentTemperature, pressure: 0, humidity: self.currentHumidity })
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('HUMIDITY'), this, function (newValue) {
      self.currentHumidity = parseFloat(newValue)
      self.chum.updateValue(parseFloat(newValue), null)
      if ((self.currentTemperature > -255) && (self.currentHumidity > -255)) {
        self.addLogEntry({ temp: self.currentTemperature, pressure: 0, humidity: self.currentHumidity })
      }
    })

    this.queryData()
  }

  queryData () {
    var self = this
    this.removeCache('ACTUAL_TEMPERATURE')
    this.removeCache('HUMIDITY')
    this.remoteGetValue('ACTUAL_TEMPERATURE')
    this.remoteGetValue('HUMIDITY') // create timer to query device every 10 minutes
    this.refreshTimer = setTimeout(function () { self.queryData() }, 10 * 60 * 1000)
  }

  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }
}

module.exports = HomeMaticHomeKitThermostatWeatherServiceIP
