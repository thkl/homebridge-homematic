'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

class HomeMaticHomeKitPowerMeterServiceIP extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    var self = this
    this.log.debug('[PMSIP] init device %s', this.address)
    this.meterChannel = this.cfg['meterChannel'] || '6'
    this.switchChannel = this.cfg['switchChannel'] || '3'
    this.enableLoggingService('energy')
    this.log.debug('[PMSIP] remove read only flag - this is a temp solution')
    this.grantAccess = true

    var sensor = this.getService(eve.Service.PowerMeterService)
    this.voltage = sensor.getCharacteristic(eve.Characteristic.Voltage)
      .on('get', function (callback) {
        self.query(self.meterChannel + '.VOLTAGE', function (value) {
          if (callback) callback(null, self.round(value, 2))
        })
      })

    this.voltage.eventEnabled = true

    this.current = sensor.getCharacteristic(eve.Characteristic.ElectricCurrent)
      .on('get', function (callback) {
        self.query(self.meterChannel + '.CURRENT', function (value) {
          if (value !== undefined) {
            self.log.debug('CURRENT is %s', value)
            value = self.round((value / 1000), 2)
            if (callback) callback(null, value)
          } else {
            if (callback) callback(null, 0)
          }
        })
      })

    this.current.eventEnabled = true

    this.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
      .on('get', function (callback) {
        self.query(self.meterChannel + '.POWER', function (value) {
          self.addLogEntry({
            power: parseFloat(value)
          })
          if (callback) callback(null, self.round(value, 4))
        })
      })

    this.power.eventEnabled = true

    this.powerConsumption = sensor.getCharacteristic(eve.Characteristic.TotalConsumption)
      .on('get', function (callback) {
        self.query(self.meterChannel + '.ENERGY_COUNTER', function (value) {
          if (callback) callback(null, self.round((value / 1000), 4))
        })
      })

    this.powerConsumption.eventEnabled = true

    this.services.push(sensor)

    var outlet = this.getService(Service.Outlet)
    outlet.getCharacteristic(Characteristic.OutletInUse)
      .on('get', function (callback) {
        if (callback) callback(null, 1)
      })

    this.c_isOn = outlet.getCharacteristic(Characteristic.On)
      .on('get', function (callback) {
        self.log.debug('[PMSIP] Query %s:%s', self.deviceaddress, self.switchChannel + '.STATE')
        self.query(self.switchChannel + '.STATE', function (value) {
          self.log.debug('[PMSIP] Queryresult for %s:%s is %s', self.deviceaddress, self.switchChannel + '.STATE', value)
          if (callback) {
            if (self.didMatch(value, true)) {
              callback(null, 1)
            } else {
              callback(null, 0)
            }
          }
        })
      })

      .on('set', function (value, callback) {
        if (self.readOnly === false) {
          if ((value === 0) || (value === false)) {
            self.log.debug('[PMSIP] Set for %s to %s', self.switchChannel + '.STATE', false)
            self.delayed('set', self.switchChannel + '.STATE', false)
          } else {
            self.log.debug('[PMSIP] Set for %s to %s', self.switchChannel + '.STATE', true)
            self.delayed('set', self.switchChannel + '.STATE', true)
          }
        } else {
          self.log.debug('[PMSIP] is ReadOnly')
        }
        callback()
      })

    this.c_isOn.eventEnabled = true

    this.deviceaddress = this.address.slice(0, this.address.indexOf(':'))

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.meterChannel + '.POWER'), this, function (newValue) {
      self.addLogEntry({
        power: parseInt(newValue)
      })
      self.log.debug('[PMSIP] registeraddressForEventProcessingAtAccessory Event Power %s', newValue)

      self.power.updateValue(self.round(newValue, 2), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.meterChannel + '.VOLTAGE'), this, function (newValue) {
      self.log.debug('[PMSIP] registeraddressForEventProcessingAtAccessory Event Voltage %s', newValue)
      self.voltage.updateValue(self.round(newValue, 2), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.meterChannel + '.CURRENT'), this, function (newValue) {
      self.log.debug('[PMSIP] registeraddressForEventProcessingAtAccessory Event Current %s', newValue)
      self.current.updateValue(self.round((newValue / 1000), 2), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.meterChannel + '.ENERGY_COUNTER'), this, function (newValue) {
      self.log.debug('[PMSIP] registeraddressForEventProcessingAtAccessory Event ENERGY_COUNTER %s', newValue)
      self.powerConsumption.updateValue((self.round((newValue / 1000), 2)), null)
    })

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint(this.switchChannel + '.STATE'), this, function (newValue) {
      if (this.c_isOn !== undefined) {
        self.c_isOn.updateValue((self.didMatch(newValue, true)) ? 1 : 0, null)
      }
    })
  }

  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }

  queryData () {
    var self = this
    let dps = [this.meterChannel + '.POWER', this.meterChannel + '.VOLTAGE', this.meterChannel + '.CURRENT', this.meterChannel + '.ENERGY_COUNTER']
    dps.map(function (dp) {
      self.remoteGetValue(dp)
    })

    // create timer to query device every 10 minutes
    this.refreshTimer = setTimeout(function () {
      self.queryData()
    }, 10 * 60 * 1000)
  }
}

module.exports = HomeMaticHomeKitPowerMeterServiceIP
