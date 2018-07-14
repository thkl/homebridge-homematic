'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

function HomeMaticHomeKitPowerMeterService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPowerMeterService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitPowerMeterService, HomeKitGenericService)

HomeMaticHomeKitPowerMeterService.prototype.shutdown = function () {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitPowerMeterService.prototype.propagateServices = function (homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}

HomeMaticHomeKitPowerMeterService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  this.enableLoggingService('energy')
  var sensor = new eve.Service.PowerMeterService(this.name)
  this.voltage = sensor.getCharacteristic(eve.Characteristic.Voltage)
    .on('get', function (callback) {
      that.query('2:VOLTAGE', function (value) {
        if (callback) callback(null, that.round(value, 2))
      })
    })

  this.voltage.eventEnabled = true

  this.current = sensor.getCharacteristic(eve.Characteristic.ElectricCurrent)
    .on('get', function (callback) {
      that.query('2:CURRENT', function (value) {
        if (value !== undefined) {
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
      that.query('2:POWER', function (value) {
        that.addLogEntry({power: parseFloat(value)})
        if (callback) callback(null, that.round(value, 4))
      })
    })

  this.power.eventEnabled = true
  this.services.push(sensor)

  var outlet = new Service['Outlet'](this.name)
  outlet.getCharacteristic(Characteristic.OutletInUse)
    .on('get', function (callback) {
      if (callback) callback(null, 1)
    })

  var cc = outlet.getCharacteristic(Characteristic.On)
    .on('get', function (callback) {
      that.query('1:STATE', function (value) {
        that.log.debug('State is %s', value)
        if (callback) callback(null, value)
      })
    })

    .on('set', function (value, callback) {
      if (that.readOnly === false) {
        if (value === 0) {
          that.delayed('set', '1:STATE', false)
        } else {
          that.delayed('set', '1:STATE', true)
        }
      }
      callback()
    })

  this.setCurrentStateCharacteristic('1:STATE', cc)

  this.powerConsumption = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
    .on('get', function (callback) {
      that.query(that.meterChannel + ':ENERGY_COUNTER', function (value) {
        if (callback) callback(null, that.round((value / 1000), 4))
      })
    })

  this.powerConsumption.eventEnabled = true

  cc.eventEnabled = true

  this.addValueMapping('1:STATE', true, 1)
  this.addValueMapping('1:STATE', false, 0)

  this.remoteGetValue('1:STATE')

  this.services.push(outlet)

  this.cadress = this.adress.replace(':2', ':1')

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.POWER', this, function (newValue) {
    that.addLogEntry({power: parseInt(newValue)})
    that.power.updateValue(that.round(newValue, 2), null)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.VOLTAGE', this, function (newValue) {
    that.voltage.updateValue(that.round(newValue, 2), null)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.CURRENT', this, function (newValue) {
    that.current.updateValue(that.round((newValue / 1000), 2), null)
  })

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.ENERGY_COUNTER', this, function (newValue) {
    that.powerConsumption.updateValue((that.round((newValue / 1000), 2)), null)
  })

  this.queryData()
}

HomeMaticHomeKitPowerMeterService.prototype.queryData = function () {
  var that = this

  let dps = ['2:POWER', '2:VOLTAGE', '2:CURRENT', '2:ENERGY_COUNTER']
  dps.map(function (dp) {
    that.remoteGetValue(dp)
  })

  // create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function () { that.queryData() }, 10 * 60 * 1000)
}

module.exports = HomeMaticHomeKitPowerMeterService
