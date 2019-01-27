'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitWaterSensorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitWaterSensorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitWaterSensorService, HomeKitGenericService)

HomeMaticHomeKitWaterSensorService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var leakSensor = new Service['LeakSensor'](this.name)
  
  this.state = leakSensor.getCharacteristic(Characteristic.LeakDetected)
    .on('get', function (callback) {
      that.query('ALARMSTATE', function (value) {
        if (callback) callback(null, value)
      })
    })
  this.currentStateCharacteristic['ALARMSTATE'] = this.state
  this.state.eventEnabled = true
  this.services.push(leakSensor)
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + '.ALARMSTATE', this)
}

HomeMaticHomeKitWaterSensorService.prototype.datapointEvent = function (dp, newValue) {
  let that = this
  if (this.isDataPointEvent(dp, 'ALARMSTATE')) {
    this.state.setValue(newValue, null)
    this.log.debug('Set ALARMSTATE to ', newValue)
    setTimeout(function () {
      that.state.setValue(false, null)
    }, 1000)
  }
}

module.exports = HomeMaticHomeKitWaterSensorService
