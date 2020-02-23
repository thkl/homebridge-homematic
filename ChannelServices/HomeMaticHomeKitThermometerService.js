'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitThermometerService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.usecache = false
    this.isMultiChannel = false
    var thermo = this.getService(Service.TemperatureSensor)
    // Enable log
    this.enableLoggingService('thermo')

    this.cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({
        minValue: -100
      })
      .on('get', function (callback) {
        this.remoteGetValue('TEMPERATURE', function (value) {
          let fval = parseFloat(value)
          self.addLogEntry({
            currentTemp: fval
          })
          if (callback) callback(null, fval)
        })
      }.bind(this))

    this.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.transformDatapoint('TEMPERATURE'), this, function (newValue) {
      self.log.debug('[HKTS] TEMPERATURE event %s', newValue)
      self.addLogEntry({
        currentTemp: parseFloat(newValue)
      })
      self.cctemp.updateValue(parseFloat(newValue), null)
    })
  }

  queryData () {
    var self = this
    this.log.debug('[HKTS] periodic measurement')
    this.removeCache('TEMPERATURE')
    this.remoteGetValue('TEMPERATURE')
    this.refreshTimer = setTimeout(function () {
      self.queryData()
    }, 10 * 60 * 1000)
  }

  shutdown () {
    this.log.debug('[HKTS] shutdown')
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }
}

module.exports = HomeMaticHomeKitThermometerService
