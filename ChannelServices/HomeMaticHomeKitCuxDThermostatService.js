'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
class HomeMaticHomeKitCuxDThermostatService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    this.usecache = false
    var thermo = this.getService(Service.TemperatureSensor)
    this.services.push(thermo)

    var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
      .setProps({ minValue: -100 })
      .on('get', function (callback) {
        this.remoteGetValue('TEMPERATURE', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.setCurrentStateCharacteristic('TEMPERATURE', cctemp)
    cctemp.eventEnabled = true

    var cchum = thermo.addCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', function (callback) {
        this.remoteGetValue('HUMIDITY', function (value) {
          if (callback) callback(null, value)
        })
      }.bind(this))

    this.setCurrentStateCharacteristic('HUMIDITY', cchum)
    cchum.eventEnabled = true

    this.remoteGetValue('TEMPERATURE')
    this.remoteGetValue('HUMIDITY')
  }
}
module.exports = HomeMaticHomeKitCuxDThermostatService
