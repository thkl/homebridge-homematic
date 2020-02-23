'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitThermometerService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    var self = this
    this.usecache = false
    var thermo = this.getService(Service.TemperatureSensor)
    // Enable log
    this.enableLoggingService('thermo')

    this.cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -100 })
      .on('get', function (callback) {
        this.remoteGetValue('TEMPERATURE', function (value) {
          self.addLogEntry({ currentTemp: parseFloat(value) })
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.eventEnabled = true

    this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('TEMPERATURE'), this, function (newValue) {
      self.cctemp.updateValue(parseFloat(newValue), null)
      self.addLogEntry({ currentTemp: parseFloat(newValue) })
    })

    this.queryData()
  }

  queryData () {
    var self = this
    this.removeCache('TEMPERATURE')
    this.remoteGetValue('TEMPERATURE')
    this.refreshTimer = setTimeout(function () { self.queryData() }, 10 * 60 * 1000)
  }

  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }
}

module.exports = HomeMaticHomeKitThermometerService
