'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const inherits = require('util').inherits
var EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

function HomeMaticHomeKitEnergyCounterService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitEnergyCounterService.super_.apply(this, arguments)
}

inherits(HomeMaticHomeKitEnergyCounterService, HomeKitGenericService)

HomeMaticHomeKitEnergyCounterService.prototype.shutdown = function () {
  clearTimeout(this.refreshTimer)
  clearTimeout(this.initialQueryTimer)
}

HomeMaticHomeKitEnergyCounterService.prototype.propagateServices = function (homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}

HomeMaticHomeKitEnergyCounterService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  // Enable the Logging Service for Energy
  this.enableLoggingService('energy')

  var sensor = new eve.Service.PowerMeterService(this.name)

  this.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
    .on('get', function (callback) {
      that.query('POWER', function (value) {
        that.addLogEntry({ power: parseFloat(value) })
        if (callback) callback(null, value)
      })
    })

  this.power.eventEnabled = true

  this.energyCounter = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
    .on('get', function (callback) {
      that.query('ENERGY_COUNTER', function (value) {
      // CCU sends wH -- homekit haz kwh - so calculate /1000
        value = (value / 1000)
        if (callback) callback(null, Number(value).toFixed(2))
      })
    })

  this.energyCounter.eventEnabled = true

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.POWER', this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.ENERGY_COUNTER', this)

  this.services.push(sensor)
  // wait some time
  this.initialQueryTimer = setTimeout(function () {
    that.queryData()
  }, 1000)
}

HomeMaticHomeKitEnergyCounterService.prototype.queryData = function () {
  var that = this
  this.query('POWER', function (value) {
    that.addLogEntry({ power: parseFloat(value) })
    that.power.updateValue(value, null)
  })

  this.query('ENERGY_COUNTER', function (value) {
    value = (value / 1000)
    that.energyCounter.updateValue(Number(value).toFixed(2), null)
  })
  // create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function () { that.queryData() }, 10 * 60 * 1000)
}

HomeMaticHomeKitEnergyCounterService.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'POWER')) {
    this.power.updateValue(newValue, null)
    this.addLogEntry({ power: parseFloat(newValue) })
  }

  if (this.isDataPointEvent(dp, 'ENERGY_COUNTER')) {
    // CCU sends wH -- homekit haz kwh - so calculate /1000
    let value = (newValue / 1000)
    this.energyCounter.updateValue(Number(value).toFixed(2), null)
  }
}

module.exports = HomeMaticHomeKitEnergyCounterService
