'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitThermalControlService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitThermalControlService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitThermalControlService, HomeKitGenericService)

HomeMaticHomeKitThermalControlService.prototype.propagateServices = function (homebridge, Service, Characteristic) {

  // Register new Characteristic or Services here

}

HomeMaticHomeKitThermalControlService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.enableLoggingService('weather')
  this.thermostat = new Service.Thermostat(this.name)
  this.services.push(this.thermostat)
  // init some outside values
  this.currentTemperature = -255
  this.currentHumidity = 0
  this.targetTemperature = -255
  this.usecache = false // cause of virtual devices
  this.delayOnSet = 500 // 500ms delay
  // this.addLowBatCharacteristic(thermo,Characteristic);

  this.currentmode = this.thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function (callback) {
      this.query('SET_TEMPERATURE', function (value) {
        if (value === 4.5) {
          that.getCurrentStateCharacteristic('TMODE').setValue(1, null)
          that.getCurrentStateCharacteristic('MODE').setValue(1, null)
          if (callback) callback(null, 0)
        } else {
          if (callback) callback(null, 1)
        }
      })
    }.bind(this))

  this.setCurrentStateCharacteristic('MODE', this.currentmode)
  this.currentmode.eventEnabled = true

  this.targetMode = this.thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', function (callback) {
      this.query('SET_TEMPERATURE', function (value) {
        if (value === 4.5) {
          if (callback) callback(null, 0)
        } else {
          if (callback) callback(null, 1)
        }
      })
    }.bind(this))

    .on('set', function (value, callback) {
      if (value === 0) {
        this.command('setrega', 'SET_TEMPERATURE', 4.5)
        this.cleanVirtualDevice('SET_TEMPERATURE')
      } else {
        this.cleanVirtualDevice('SET_TEMPERATURE')
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

  this.setCurrentStateCharacteristic('TMODE', this.targetMode)
  this.targetMode.eventEnabled = true

  this.currentTemperatureCharacteristic = this.thermostat.getCharacteristic(Characteristic.CurrentTemperature)
    .on('get', function (callback) {
      that.remoteGetValue('ACTUAL_TEMPERATURE', function (value) {
        that.log.debug('[TCS] Saving %s for %s', value, that.adress)
        that.currentTemperature = parseFloat(value)
        if (callback) callback(null, that.currentTemperature)
      })
    })

  this.currentTemperatureCharacteristic.eventEnabled = true

  if (this.type === 'THERMALCONTROL_TRANSMIT') {
    this.currentHumidityCharacteristic = this.thermostat.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', function (callback) {
        that.query('ACTUAL_HUMIDITY', function (value) {
          that.currentHumidity = parseFloat(value)
          if (callback) callback(null, that.currentHumidity)
        })
      })

    this.currentHumidityCharacteristic.eventEnabled = true
  }

  this.targetTemperatureCharacteristic = this.thermostat.getCharacteristic(Characteristic.TargetTemperature)
    .on('get', function (callback) {
      this.query('SET_TEMPERATURE', function (value) {
        if (value === 4.5) {
          that.getCurrentStateCharacteristic('TMODE').setValue(0, null)
          that.getCurrentStateCharacteristic('MODE').setValue(0, null)
        } else {
          that.getCurrentStateCharacteristic('TMODE').setValue(1, null)
          that.getCurrentStateCharacteristic('MODE').setValue(1, null)
        }

        if (value < 10) {
          value = 10
        }
        if (callback) callback(null, parseFloat(value))
      })

      this.query('CONTROL_MODE', undefined)
    }.bind(this))

    .on('set', function (value, callback) {
      if (that.getCache('CONTROL_MODE') !== 1) {
        that.delayed('set', 'MANU_MODE', {
          'explicitDouble': value
        }, that.delayOnSet)
        that.setCache('CONTROL_MODE', 1) // set to Manual Mode
      } else {
        that.delayed('set', 'SET_TEMPERATURE', {
          'explicitDouble': value
        }, that.delayOnSet)
      }
      callback()
    })

  this.targetTemperatureCharacteristic.eventEnabled = true

  this.thermostat.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function (callback) {
      if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS)
    })

  this.cleanVirtualDevice('ACTUAL_TEMPERATURE')
  this.remoteGetValue('CONTROL_MODE')

  if (this.type === 'THERMALCONTROL_TRANSMIT') {
    this.cleanVirtualDevice('ACTUAL_HUMIDITY')
  }

  // register all Datapoints for Events
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.ACTUAL_HUMIDITY', this, function (newValue) {
    that.processChange('ACTUAL_HUMIDITY', newValue)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.CONTROL_MODE', this)

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.ACTUAL_TEMPERATURE', this, function (newValue) {
    that.processChange('ACTUAL_TEMPERATURE', newValue)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.SET_TEMPERATURE', this, function (newValue) {
    that.processChange('SET_TEMPERATURE', newValue)
  })

  // Finally Run a query
  this.log.debug('[TCS] initial query')
  this.queryData()
}

HomeMaticHomeKitThermalControlService.prototype.queryData = function () {
  var that = this

  this.remoteGetValue('ACTUAL_TEMPERATURE', function (value) {
    that.processChange('ACTUAL_TEMPERATURE', value)
  })

  if (this.currentHumidityCharacteristic) {
    this.remoteGetValue('ACTUAL_HUMIDITY', function (value) {
      that.processChange('ACTUAL_HUMIDITY', value)
    })
  }

  this.remoteGetValue('SET_TEMPERATURE', function (value) {
    that.processChange('SET_TEMPERATURE', value)
  })

  // create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function () {
    that.queryData()
  }, 10 * 60 * 1000)
}

HomeMaticHomeKitThermalControlService.prototype.shutdown = function () {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitThermalControlService.prototype.processChange = function (dp, newValue) {
  this.log.debug('[TCS] processChange %s with %s', dp, newValue)
  if (this.isDataPointEvent(dp, 'ACTUAL_TEMPERATURE')) {
    this.log.debug('[TCS] set currentTemperature to %s', newValue)
    this.currentTemperature = parseFloat(newValue)
    this.currentTemperatureCharacteristic.updateValue(this.currentTemperature, null)
  }

  if (this.isDataPointEvent(dp, 'ACTUAL_HUMIDITY')) {
    this.log.debug('[TCS] set currentHumidity to %s', newValue)
    this.currentHumidity = parseFloat(newValue)
    if (this.currentHumidityCharacteristic !== undefined) {
      this.currentHumidityCharacteristic.updateValue(this.currentHumidity, null)
    }
  }
  if (this.isDataPointEvent(dp, 'SET_TEMPERATURE')) {
    this.log.debug('[TCS] set targetTemperature to %s', newValue)
    if (parseFloat(newValue) === 4.5) {
      this.targetMode.updateValue(0, null)
      this.currentmode.updateValue(0, null)
    } else {
      this.targetMode.updateValue(1, null)
      this.currentmode.updateValue(1, null)
    }
    this.targetTemperatureCharacteristic.updateValue(parseFloat(newValue), null)
  }

  if (this.currentTemperature > -255) {
    this.addLogEntry({
      temp: this.currentTemperature,
      pressure: 0,
      humidity: this.currentHumidity
    })
  }
}

module.exports = HomeMaticHomeKitThermalControlService
