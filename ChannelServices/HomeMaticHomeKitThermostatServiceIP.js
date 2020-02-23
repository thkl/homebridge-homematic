'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitIPThermostatService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.usecache = false
    var thermo = this.getService(Service.Thermostat)
    this.enableLoggingService('thermo')

    this.currentMode = thermo.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', function (callback) {
        self.query('SET_POINT_TEMPERATURE', function (value) {
          if (value < 6.0) {
            self.getCurrentStateCharacteristic('CONTROL_MODE').setValue(1, null)
            if (callback) callback(null, 0)
          } else {
            self.getCurrentStateCharacteristic('CONTROL_MODE').setValue(0, null)
            if (callback) callback(null, 1)
          }
        })
      })

    this.currentMode.eventEnabled = true

    this.targetMode = thermo.getCharacteristic(Characteristic.TargetHeatingCoolingState)
      .on('get', function (callback) {
        self.query('SET_POINT_TEMPERATURE', function (value) {
          if (value < 6.0) {
            if (callback) callback(null, 0)
          } else {
            if (callback) callback(null, 1)
          }
        })
      })

      .on('set', function (value, callback) {
        if (value === 0) {
          this.command('setrega', 'SET_POINT_TEMPERATURE', 0)
          this.cleanVirtualDevice('SET_POINT_TEMPERATURE')
        } else {
          this.cleanVirtualDevice('SET_POINT_TEMPERATURE')
        }
        callback()
      }.bind(this))

    this.targetMode.setProps({
      format: Characteristic.Formats.UINT8,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY],
      maxValue: 1,
      minValue: 0,
      minStep: 1
    })

    this.cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -100 })
      .on('get', function (callback) {
        this.remoteGetValue('ACTUAL_TEMPERATURE', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.cctemp.eventEnabled = true

    this.cchum = thermo.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', function (callback) {
        this.remoteGetValue('HUMIDITY', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.cchum.eventEnabled = true

    this.ttemp = thermo.getCharacteristic(Characteristic.TargetTemperature)
      .setProps({ minValue: 6.0, maxValue: 30.5, minStep: 0.1 })
      .on('get', function (callback) {
        this.query('SET_POINT_TEMPERATURE', function (value) {
          if (value < 6) {
            value = 6
          }
          if (value > 30) {
            value = 30.5
          }
          if (callback) callback(null, value)
        })
      }.bind(this))

      .on('set', function (value, callback) {
        this.delayed('setrega', 'SET_POINT_TEMPERATURE', value, 500)
        callback()
      }.bind(this))

    this.ttemp.eventEnabled = true

    thermo.getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', function (callback) {
        if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS)
      })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('HUMIDITY'), this, function (newValue) {
      self.cchum.updateValue(parseFloat(newValue), null)
      self.addLogEntry({ humidity: parseFloat(newValue) })
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('ACTUAL_TEMPERATURE'), this, function (newValue) {
      self.cctemp.updateValue(parseFloat(newValue), null)
      self.addLogEntry({ currentTemp: parseFloat(newValue) })
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('SET_POINT_TEMPERATURE'), this, function (newValue) {
      self.ttemp.updateValue(parseFloat(newValue), null)
      self.addLogEntry({ setTemp: parseFloat(newValue) })
    })

    this.queryData()
  }

  queryData () {
    var self = this
    this.removeCache('ACTUAL_TEMPERATURE')
    this.removeCache('HUMIDITY')
    this.remoteGetValue('HUMIDITY')
    this.remoteGetValue('ACTUAL_TEMPERATURE')
    // create timer to query device every 10 minutes
    this.refreshTimer = setTimeout(function () { self.queryData() }, 10 * 60 * 1000)
  }

  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }
}

module.exports = HomeMaticHomeKitIPThermostatService
