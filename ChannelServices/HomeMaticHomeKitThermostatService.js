'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitThermostatService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitThermostatService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitThermostatService, HomeKitGenericService)

HomeMaticHomeKitThermostatService.prototype.createDeviceService = function (Service, Characteristic) {
  var self = this
  self.usecache = false
  var thermo = new Service.Thermostat(self.name)
  self.services.push(thermo)
  self.delayOnSet = 500
  self.enableLoggingService('thermo')

  // this.addLowBatCharacteristic(thermo,Characteristic);

  var mode = thermo.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function (callback) {
      self.query('2.SETPOINT', function (value) {
        if (value < 6.0) {
          self.getCurrentStateCharacteristic('MODE').setValue(1, null)
          if (callback) callback(null, 0)
        } else {
          if (callback) callback(null, 1)
        }
      })
    })

  self.setCurrentStateCharacteristic('MODE', mode)
  mode.eventEnabled = true

  var targetMode = thermo.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', function (callback) {
      self.query('2.SETPOINT', function (value) {
        if (value < 6.0) {
          if (callback) callback(null, 0)
        } else {
          if (callback) callback(null, 1)
        }
      })
    })

    .on('set', function (value, callback) {
      if (value === 0) {
        self.command('setrega', '2.SETPOINT', 0)
        self.cleanVirtualDevice('SETPOINT')
      } else {
        self.cleanVirtualDevice('SETPOINT')
      }
      callback()
    })

  targetMode.setProps({
    format: Characteristic.Formats.UINT8,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY],
    maxValue: 1,
    minValue: 0,
    minStep: 1
  })

  self.currentTempCharacteristic = thermo.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({
      minValue: -100
    })
    .on('get', function (callback) {
      self.remoteGetValue('1.TEMPERATURE', function (value) {
        self.addLogEntry({
          currentTemp: parseFloat(value)
        })
        if (callback) callback(null, value)
      })
    })

  self.currentTempCharacteristic.eventEnabled = true

  self.currentHumidityCharacteristic = thermo.getCharacteristic(Characteristic.CurrentRelativeHumidity)
    .on('get', function (callback) {
      self.remoteGetValue('1.HUMIDITY', function (value) {
        self.addLogEntry({
          humidity: parseFloat(value)
        })
        if (callback) callback(null, value)
      })
    })

  self.currentHumidityCharacteristic.eventEnabled = true

  self.TargetTemperatureCharacteristic = thermo.getCharacteristic(Characteristic.TargetTemperature)
    .setProps({
      minValue: 6.0,
      maxValue: 30.5,
      minStep: 0.1
    })
    .on('get', function (callback) {
      self.query('2.SETPOINT', function (value) {
        if (value < 6) {
          value = 6
        }
        if (value > 30) {
          value = 30.5
        }
        self.addLogEntry({
          setTemp: parseFloat(value)
        })
        if (callback) callback(null, value)
      })
    })

    .on('set', function (value, callback) {
      if (value > 30) {
        self.delayed('setrega', '2.SETPOINT', 100, self.delayOnSet)
      } else {
        self.delayed('setrega', '2.SETPOINT', value, self.delayOnSet)
      }
      callback()
    })

  self.TargetTemperatureCharacteristic.eventEnabled = true

  thermo.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function (callback) {
      if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS)
    })

  let parts = self.adress.split('.')
  self.deviceAdress = parts[0] + '.' + parts[1].split(':')[0]
  self.platform.registerAdressForEventProcessingAtAccessory(self.deviceAdress + ':1.TEMPERATURE', self)
  self.platform.registerAdressForEventProcessingAtAccessory(self.deviceAdress + ':2.SETPOINT', self)
  self.platform.registerAdressForEventProcessingAtAccessory(self.deviceAdress + ':1.HUMIDITY', self)

  this.remoteGetValue('TEMPERATURE')
  this.remoteGetValue('HUMIDITY')
  this.remoteGetValue('SETPOINT')
  this.queryData()
}

HomeMaticHomeKitThermostatService.prototype.queryData = function () {
  let self = this
  self.query('1.HUMIDITY', function (value) {
    self.addLogEntry({
      humidity: parseFloat(value)
    })
  })

  self.query('1.TEMPERATURE', function (value) {
    self.addLogEntry({
      currentTemp: parseFloat(value)
    })
  })
  // create timer to query device every 10 minutes
  self.refreshTimer = setTimeout(function () {
    self.queryData()
  }, 10 * 60 * 1000)
}

HomeMaticHomeKitThermostatService.prototype.shutdown = function () {
  let self = this
  clearTimeout(self.refreshTimer)
}

HomeMaticHomeKitThermostatService.prototype.datapointEvent = function (dp, newValue) {
  let self = this
  this.log.debug('[LTS] datapointEvent %s (%s)', dp, newValue)
  if (dp === '1.TEMPERATURE') {
    self.addLogEntry({
      currentTemp: parseFloat(newValue)
    })
    this.currentTempCharacteristic.updateValue(parseFloat(newValue), null)
  }

  if (dp === '1.HUMIDITY') {
    self.addLogEntry({
      currentTemp: parseFloat(newValue)
    })
    self.currentHumidityCharacteristic.updateValue(parseFloat(newValue), null)
  }

  if (dp === '2.SETPOINT') {
    self.addLogEntry({
      setTemp: parseFloat(newValue)
    })
    self.TargetTemperatureCharacteristic.updateValue(parseFloat(newValue), null)
  }
}

module.exports = HomeMaticHomeKitThermostatService
