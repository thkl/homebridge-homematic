'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const inherits = require('util').inherits
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

class HomeMaticHomeKitEnergyCounterService extends HomeKitGenericService {
  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
    clearTimeout(this.initialQueryTimer)
  }

  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    var self = this
    // Enable the Logging Service for Energy
    this.enableLoggingService('energy')

    var sensor = this.getService(eve.Service.PowerMeterService)

    this.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
      .on('get', function (callback) {
        self.query('POWER', function (value) {
          self.addLogEntry({ power: parseFloat(value) })
          if (callback) callback(null, value)
        })
      })

    this.power.eventEnabled = true

    this.energyCounter = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
      .on('get', function (callback) {
        self.query('ENERGY_COUNTER', function (value) {
          // CCU sends wH -- homekit haz kwh - so calculate /1000
          value = (value / 1000)
          if (callback) callback(null, Number(value).toFixed(2))
        })
      })

    this.energyCounter.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.address + '.POWER', this)
    this.platform.registeraddressForEventProcessingAtAccessory(this.address + '.ENERGY_COUNTER', this)

    // wait some time
    this.initialQueryTimer = setTimeout(function () {
      self.queryData()
    }, 500)
  }

  queryData () {
    var self = this
    this.query('POWER', function (value) {
      self.addLogEntry({ power: parseFloat(value) })
      self.power.updateValue(value, null)
    })

    this.query('ENERGY_COUNTER', function (value) {
      value = (value / 1000)
      self.energyCounter.updateValue(Number(value).toFixed(2), null)
    })
    // create timer to query device every 10 minutes
    this.refreshTimer = setTimeout(function () { self.queryData() }, 10 * 60 * 1000)
  }

  datapointEvent (dp, newValue) {
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
}

module.exports = HomeMaticHomeKitEnergyCounterService
