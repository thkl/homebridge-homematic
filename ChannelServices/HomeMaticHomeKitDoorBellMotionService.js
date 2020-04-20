'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitDoorBellMotionService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitDoorBellMotionService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitDoorBellMotionService, HomeKitGenericService)

HomeMaticHomeKitDoorBellMotionService.prototype.createDeviceService = function (Service, Characteristic) {
  this.log.info('Adding DoorBell as Motion Sensor')
  this.sensor = new Service['MotionSensor'](this.name)
  this.state = this.sensor.getCharacteristic(Characteristic.MotionDetected)
    .on('get', function (callback) {
      if (callback) callback(null, false)
    })

  this.currentStateCharacteristic['PRESS_SHORT'] = this.state
  this.state.eventEnabled = true
  this.services.push(this.sensor)
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(':'))
}

HomeMaticHomeKitDoorBellMotionService.prototype.datapointEvent = function (dp, newValue) {
  let that = this
  if ((this.isDataPointEvent(dp, 'PRESS_SHORT')) && (newValue === true)) {
    this.state.setValue(true, null)
    this.log.debug('Set Motion to true')
    setTimeout(function () {
      that.state.setValue(false, null)
    }, 1000)
  }
}

module.exports = HomeMaticHomeKitDoorBellMotionService
