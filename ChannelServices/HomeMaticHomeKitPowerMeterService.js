'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

class HomeMaticHomeKitPowerMeterService extends HomeKitGenericService {
  shutdown () {
    this.log.debug('[PMS] shutdown')
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }

  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    var self = this
    self.enableLoggingService('energy')
    var sensor = self.getService(eve.Service.PowerMeterService)
    self.voltage = sensor.getCharacteristic(eve.Characteristic.Voltage)
      .on('get', function (callback) {
        self.query('2.VOLTAGE', function (value) {
          if (callback) callback(null, self.round(value, 2))
        })
      })

    self.voltage.eventEnabled = true

    self.current = sensor.getCharacteristic(eve.Characteristic.ElectricCurrent)
      .on('get', function (callback) {
        self.query('2.CURRENT', function (value) {
          if (value !== undefined) {
            value = self.round((value / 1000), 2)
            if (callback) callback(null, value)
          } else {
            if (callback) callback(null, 0)
          }
        })
      })

    self.current.eventEnabled = true

    self.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
      .on('get', function (callback) {
        self.query('2.POWER', function (value) {
          self.addLogEntry({
            power: parseFloat(value)
          })
          if (callback) callback(null, self.round(value, 4))
        })
      })

    self.power.eventEnabled = true

    var outlet = new Service['Outlet'](self.name)
    outlet.getCharacteristic(Characteristic.OutletInUse)
      .on('get', function (callback) {
        if (callback) callback(null, 1)
      })

    this.isOn = outlet.getCharacteristic(Characteristic.On)
      .on('get', function (callback) {
        self.query('1.STATE', function (value) {
          self.log.debug('State is %s', value)
          if (callback) callback(null, value)
        })
      })

      .on('set', function (value, callback) {
        if (self.readOnly === false) {
          if (value === 0) {
            self.delayed('set', '1.STATE', false)
          } else {
            self.delayed('set', '1.STATE', true)
          }
        }
        callback()
      })

    self.powerConsumption = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
      .on('get', function (callback) {
        self.query(self.meterChannel + '.ENERGY_COUNTER', function (value) {
          if (callback) callback(null, self.round((value / 1000), 4))
        })
      })

    self.powerConsumption.eventEnabled = true

    this.isOn.eventEnabled = true

    self.caddress = self.address.replace(':2', ':1')

    self.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('POWER'), self, function (newValue) {
      self.log.debug('[PMS] Event for POWER with %s. Save to HK', newValue)
      self.addLogEntry({
        power: parseInt(newValue)
      })
      self.power.updateValue(self.round(newValue, 2), null)
    })

    self.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('VOLTAGE'), self, function (newValue) {
      self.voltage.updateValue(self.round(newValue, 2), null)
    })

    self.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('CURRENT'), self, function (newValue) {
      self.current.updateValue(self.round((newValue / 1000), 2), null)
    })

    self.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('.ENERGY_COUNTER'), self, function (newValue) {
      self.powerConsumption.updateValue((self.round((newValue / 1000), 2)), null)
    })

    self.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('1.STATE'), self, function (newValue) {
      self.isOn.updateValue(self.isTrue(newValue), null)
    })
  }

  queryData () {
    var self = this

    let dps = ['2.POWER', '2.VOLTAGE', '2.CURRENT', '2.ENERGY_COUNTER']
    dps.map(function (dp) {
      self.remoteGetValue(dp)
    })

    // create timer to query device every 10 minutes
    self.refreshTimer = setTimeout(function () {
      self.queryData()
    }, 10 * 60 * 1000)
  }
}

module.exports = HomeMaticHomeKitPowerMeterService
