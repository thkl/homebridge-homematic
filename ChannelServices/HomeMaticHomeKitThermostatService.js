'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitThermostatService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    self.usecache = false
    var thermo = this.getService(Service.Thermostat)
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

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('1.TEMPERATURE'), self, function (newValue) {
      self.addLogEntry({
        currentTemp: parseFloat(newValue)
      })
      self.currentTempCharacteristic.updateValue(parseFloat(newValue), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('2.SETPOINT'), self, function (newValue) {
      self.addLogEntry({
        currentTemp: parseFloat(newValue)
      })
      self.TargetTemperatureCharacteristic.updateValue(parseFloat(newValue), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('1.HUMIDITY'), self, function (newValue) {
      self.addLogEntry({
        humidity: parseFloat(newValue)
      })
      self.currentHumidityCharacteristic.updateValue(parseFloat(newValue), null)
    })

    this.queryData()
  }

  queryData () {
    let self = this
    self.remoteGetValue('1.HUMIDITY')
    self.remoteGetValue('1.TEMPERATURE')
    self.remoteGetValue('2.SETPOINT')

    // create timer to query device every 10 minutes
    self.refreshTimer = setTimeout(function () {
      self.queryData()
    }, 10 * 60 * 1000)
  }

  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }
}

module.exports = HomeMaticHomeKitThermostatService
