'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitThermalControlService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.enableLoggingService('weather')
    this.thermostat = this.getService(Service.Thermostat)
    // init some outside values
    this.currentTemperature = -255
    this.currentHumidity = 0
    this.controlMode = 0
    this.targetTemperature = -255
    this.usecache = false // cause of virtual devices
    this.delayOnSet = 500 // 500ms delay
    // this.addLowBatCharacteristic(thermo,Characteristic);

    this.currentmode = this.thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
      .on('get', function (callback) {
        this.query('SET_TEMPERATURE', function (value) {
          if (value === 4.5) {
            self.getCurrentStateCharacteristic('TMODE').setValue(1, null)
            self.getCurrentStateCharacteristic('MODE').setValue(1, null)
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
        self.remoteGetValue('ACTUAL_TEMPERATURE', function (value) {
          self.log.debug('[TCS] Saving %s for %s', value, self.address)
          self.currentTemperature = parseFloat(value)
          if (callback) callback(null, parseFloat(value))
        })
      })

    this.currentTemperatureCharacteristic.eventEnabled = true

    if (this.type === 'THERMALCONTROL_TRANSMIT') {
      this.currentHumidityCharacteristic = this.thermostat.getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on('get', function (callback) {
          self.query('ACTUAL_HUMIDITY', function (value) {
            self.currentHumidity = parseFloat(value)
            if (callback) callback(null, value)
          })
        })

      this.currentHumidityCharacteristic.eventEnabled = true
    }

    this.targetTemperatureCharacteristic = this.thermostat.getCharacteristic(Characteristic.TargetTemperature)
      .on('get', function (callback) {
        this.query('SET_TEMPERATURE', function (value) {
          if (value === 4.5) {
            self.getCurrentStateCharacteristic('TMODE').setValue(0, null)
            self.getCurrentStateCharacteristic('MODE').setValue(0, null)
          } else {
            self.getCurrentStateCharacteristic('TMODE').setValue(1, null)
            self.getCurrentStateCharacteristic('MODE').setValue(1, null)
          }

          if (value < 10) {
            value = 10
          }
          if (callback) callback(null, value)
        })

        this.query('CONTROL_MODE', undefined)
      }.bind(this))

      .on('set', function (value, callback) {
        if (self.getCache('CONTROL_MODE') !== 1) {
          self.delayed('set', 'MANU_MODE', {
            'explicitDouble': value
          }, self.delayOnSet)
          self.setCache('CONTROL_MODE', 1) // set to Manual Mode
        } else {
          self.delayed('set', 'SET_TEMPERATURE', {
            'explicitDouble': value
          }, self.delayOnSet)
        }
        callback()
      })

    this.targetTemperatureCharacteristic.eventEnabled = true

    this.thermostat.getCharacteristic(Characteristic.TemperatureDisplayUnits)
      .on('get', function (callback) {
        if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS)
      })

    this.cleanVirtualDevice('ACTUAL_TEMPERATURE')

    if (this.type === 'THERMALCONTROL_TRANSMIT') {
      this.cleanVirtualDevice('ACTUAL_HUMIDITY')
    }
    this.boostState = 0
    this.boostButton = this.getService(Service.Switch)
    this.boostCharacteristic = this.boostButton.getCharacteristic(Characteristic.On)
      .on('get', function (callback) {
        if (callback) callback(null, (self.boostState > 0))
      })
      .on('set', function (value, callback) {
        self.log.debug('[TCS] SET Boost %s', value)
        if (value === true) {
          self.command('setrega', 'BOOST_MODE', 1)
        } else {
          if (self.controlMode === 0) {
            self.log.debug('[TCS] boost is off restoring controlmode auto')
            self.command('setrega', 'AUTO_MODE', 1)
          } else {
            self.log.debug('[TCS] boost is off restoring controlmode manu')
            self.command('setrega', 'MANU_MODE', 1)
          }
        }
        if (callback) {
          callback()
        }
      })

    // register all Datapoints for Events
    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('ACTUAL_HUMIDITY'), this, function (newValue) {
      self.processChange('ACTUAL_HUMIDITY', newValue)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('CONTROL_MODE'), this, function (newValue) {
      // Ignore Boost Mode (3) as previous control mode
      if (parseInt(newValue) !== 3) {
        self.controlMode = parseInt(newValue)
        self.log.debug('[TCS] controlMode is %s', newValue)
      } else {
        self.log.debug('[TCS] ignore Boost Mode as controlMode 3')
      }
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('ACTUAL_TEMPERATURE'), this, function (newValue) {
      self.processChange('ACTUAL_TEMPERATURE', newValue)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('SET_TEMPERATURE'), this, function (newValue) {
      self.processChange('SET_TEMPERATURE', newValue)
    })

    if (this.boostCharacteristic) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('BOOST_STATE'), this, function (newValue) {
        self.log.debug('[TCS] BOOST STATE is %s', newValue)
        self.boostState = parseInt(newValue)
        self.boostCharacteristic.updateValue((self.boostState > 0), null)
      })
    }

    this.queryData()
  }

  queryData () {
    var self = this
    this.removeCache('ACTUAL_TEMPERATURE')
    this.remoteGetValue('ACTUAL_TEMPERATURE')

    // Only fetch Humidity if the sensor is capable
    if (this.currentHumidityCharacteristic) {
      this.removeCache('ACTUAL_HUMIDITY')
      this.remoteGetValue('ACTUAL_HUMIDITY')
    }
    this.removeCache('SET_TEMPERATURE')
    this.remoteGetValue('SET_TEMPERATURE')

    // create timer to query device every 10 minutes
    this.refreshTimer = setTimeout(function () {
      self.queryData()
    }, 10 * 60 * 1000)
  }

  shutdown () {
    this.log.debug('[TCS] shutdown')
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }

  processChange (dp, newValue) {
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
}

module.exports = HomeMaticHomeKitThermalControlService
