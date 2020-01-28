'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

function HomeMaticHomeKitPowerMeterServiceIP (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPowerMeterServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitPowerMeterServiceIP, HomeKitGenericService)

HomeMaticHomeKitPowerMeterServiceIP.prototype.propagateServices = function (homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.log.debug('[PMS] init device %s', this.adress)
  this.meterChannel = this.cfg['meterChannel'] || '6'
  this.switchChannel = this.cfg['switchChannel'] || '3'
  this.enableLoggingService('energy')
  this.log.debug('[PMS] remove read only flag - this is a temp solution')
  this.grantAccess = true

  var sensor = new eve.Service.PowerMeterService(this.name)
  this.voltage = sensor.getCharacteristic(eve.Characteristic.Voltage)
    .on('get', function (callback) {
      that.query(that.meterChannel + '.VOLTAGE', function (value) {
        if (callback) callback(null, that.round(value, 2))
      })
    })

  this.voltage.eventEnabled = true

  this.current = sensor.getCharacteristic(eve.Characteristic.ElectricCurrent)
    .on('get', function (callback) {
      that.query(that.meterChannel + '.CURRENT', function (value) {
        if (value !== undefined) {
          that.log.debug('CURRENT is %s', value)
          value = that.round((value / 1000), 2)
          if (callback) callback(null, value)
        } else {
          if (callback) callback(null, 0)
        }
      })
    })

  this.current.eventEnabled = true

  this.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
    .on('get', function (callback) {
      that.query(that.meterChannel + '.POWER', function (value) {
        that.addLogEntry({
          power: parseFloat(value)
        })
        if (callback) callback(null, that.round(value, 4))
      })
    })

  this.power.eventEnabled = true

  this.powerConsumption = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
    .on('get', function (callback) {
      that.query(that.meterChannel + '.ENERGY_COUNTER', function (value) {
        if (callback) callback(null, that.round((value / 1000), 4))
      })
    })

  this.powerConsumption.eventEnabled = true

  this.services.push(sensor)

  var outlet = new Service.Outlet(this.name)
  outlet.getCharacteristic(Characteristic.OutletInUse)
    .on('get', function (callback) {
      if (callback) callback(null, 1)
    })

  this.c_isOn = outlet.getCharacteristic(Characteristic.On)
    .on('get', function (callback) {
      that.log.debug('[PMS] Query %s', that.switchChannel + '.STATE')
      that.query(that.switchChannel + '.STATE', function (value) {
        that.log.debug('[PMS] Queryresult for %s is %s', that.switchChannel + '.STATE', value)
        if (callback) {
          if (that.didMatch(value, true)) {
            callback(null, 1)
          } else {
            callback(null, 0)
          }
        }
      })
    })

    .on('set', function (value, callback) {
      if (that.readOnly === false) {
        if ((value === 0) || (value === false)) {
          that.log.debug('[PMS] Set for %s to %s', that.switchChannel + '.STATE', false)
          that.delayed('set', that.switchChannel + '.STATE', false)
        } else {
          that.log.debug('[PMS] Set for %s to %s', that.switchChannel + '.STATE', true)
          that.delayed('set', that.switchChannel + '.STATE', true)
        }
      }
      callback()
    })

  this.c_isOn.eventEnabled = true

  this.services.push(outlet)
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':' + this.meterChannel + '.POWER', this, function (newValue) {
    that.addLogEntry({
      power: parseInt(newValue)
    })
    that.power.updateValue(that.round(newValue, 2), null)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':' + this.meterChannel + '.VOLTAGE', this, function (newValue) {
    that.voltage.updateValue(that.round(newValue, 2), null)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':' + this.meterChannel + '.CURRENT', this, function (newValue) {
    that.current.updateValue(that.round((newValue / 1000), 2), null)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':' + this.meterChannel + '.ENERGY_COUNTER', this, function (newValue) {
    that.powerConsumption.updateValue((that.round((newValue / 1000), 2)), null)
  })

  // Wait a Second
  this.refreshTimer = setTimeout(function () {
    that.log.debug('[PMS] Inital Data Query')
    that.queryData()
    that.log.debug('[PMS] Inital State Query %s.STATE', that.switchChannel)
    that.remoteGetValue(that.switchChannel + '.STATE')
  }, 1000)
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.shutdown = function () {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.datapointEvent = function (dp, newValue) {
  this.log.debug('[PMS] Event %s (%s)', dp, newValue)
  if (dp === this.switchChannel + '.STATE') {
    let hmState = ((newValue === 'true') || (newValue === true)) ? 1 : 0
    this.log.debug('[PMS] Switch Event result %s', newValue)

    if (this.c_isOn !== undefined) {
      this.c_isOn.updateValue(hmState, null)
    }
  }
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.queryData = function () {
  var that = this
  let dps = [this.meterChannel + '.POWER', this.meterChannel + '.VOLTAGE', this.meterChannel + '.CURRENT', this.meterChannel + '.ENERGY_COUNTER']
  dps.map(function (dp) {
    that.remoteGetValue(dp)
  })

  // create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function () {
    that.queryData()
  }, 10 * 60 * 1000)
}

module.exports = HomeMaticHomeKitPowerMeterServiceIP
