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
  this.meterChannel = this.cfg['meterChannel'] || '6'
  this.switchChannel = this.cfg['switchChannel'] || '3'
  this.enableLoggingService('energy')

  var sensor = new eve.Service.PowerMeterService(this.name)
  this.voltage = sensor.getCharacteristic(eve.Characteristic.Voltage)
    .on('get', function (callback) {
      that.query(that.meterChannel + ':VOLTAGE', function (value) {
        if (callback) callback(null, that.round(value, 2))
      })
    })

  this.voltage.eventEnabled = true

  this.current = sensor.getCharacteristic(eve.Characteristic.ElectricCurrent)
    .on('get', function (callback) {
      that.query(that.meterChannel + ':CURRENT', function (value) {
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
      that.query(that.meterChannel + ':POWER', function (value) {
        that.addLogEntry({ power: parseFloat(value) })
        if (callback) callback(null, that.round(value, 4))
      })
    })

  this.power.eventEnabled = true

  this.powerConsumption = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
    .on('get', function (callback) {
      that.query(that.meterChannel + ':ENERGY_COUNTER', function (value) {
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

  var cc = outlet.getCharacteristic(Characteristic.On)
    .on('get', function (callback) {
      that.query(that.switchChannel + ':STATE', function (value) {
        if (callback) callback(null, value)
      })
    })

    .on('set', function (value, callback) {
      if (that.readOnly === false) {
        if ((value === 0) || (value === false)) {
          that.delayed('set', that.switchChannel + ':STATE', false)
        } else {
          that.delayed('set', that.switchChannel + ':STATE', true)
        }
      }
      callback()
    })

  this.setCurrentStateCharacteristic(that.switchChannel + ':STATE', cc)
  cc.eventEnabled = true

  this.addValueMapping(that.switchChannel + ':STATE', true, 1)
  this.addValueMapping(that.switchChannel + ':STATE', false, 0)

  this.remoteGetValue(that.switchChannel + ':STATE')

  this.services.push(outlet)
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ':' + this.meterChannel + '.POWER', this, function (newValue) {
    that.addLogEntry({ power: parseInt(newValue) })
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
  this.refreshTimer = setTimeout(function () { that.queryData() }, 1000)
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.shutdown = function () {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.queryData = function () {
  var that = this
  let dps = [this.meterChannel + ':POWER', this.meterChannel + ':VOLTAGE', this.meterChannel + ':CURRENT', this.meterChannel + ':ENERGY_COUNTER']
  dps.map(function (dp) {
    that.remoteGetValue(dp)
  })

  // create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function () { that.queryData() }, 10 * 60 * 1000)
}

module.exports = HomeMaticHomeKitPowerMeterServiceIP
