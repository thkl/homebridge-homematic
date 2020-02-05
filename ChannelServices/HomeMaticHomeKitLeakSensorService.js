'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitLeakSensorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitLeakSensorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitLeakSensorService, HomeKitGenericService)

HomeMaticHomeKitLeakSensorService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var leakSensor = new Service['LeakSensor'](this.name)
  this.state = leakSensor.getCharacteristic(Characteristic.LeakDetected)
    .on('get', function (callback) {
      that.query('STATE', function (value) {
        if (callback) callback(null, value)
      })
    })

  this.currentStateCharacteristic['STATE'] = this.state
  this.state.eventEnabled = true
  this.services.push(leakSensor)
  this.remoteGetValue('STATE')
}

HomeMaticHomeKitLeakSensorService.prototype.datapointEvent = function (dp, newValue) {
  this.log.info('[Leak Service] Event %s vs %s value is %s', dp, this.channelnumber + '.STATE', newValue)
  if (dp === this.channelnumber + '.STATE') {
    switch (newValue) {
      case 0:
        this.state.updateValue(0, null)
        break
      case false:
        this.state.updateValue(0, null)
        break
      case true:
        this.state.updateValue(1, null)
        break
      case 1:
        this.state.updateValue(1, null)
        break
      case 2:
        this.state.updateValue(1, null)
        break
    }
  }
}

module.exports = HomeMaticHomeKitLeakSensorService
