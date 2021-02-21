'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitSmokeDetectorService (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitSmokeDetectorService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitSmokeDetectorService, HomeKitGenericService)

HomeMaticHomeKitSmokeDetectorService.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this
  var sensor = new Service.SmokeSensor(this.name)
  this.detectorstate = sensor.getCharacteristic(Characteristic.SmokeDetected)
    .on('get', function (callback) {
      that.query('STATE', function (value) {
        if (callback) {
          if (that.isTrue(value)) {
            callback(null, 1) // SMOKE_DETECTED = 1;
          } else {
            callback(null, 0) // SMOKE_NOT_DETECTED = 0;
          }
        }
      })
    })
  this.detectorstate.eventEnabled = true
  this.services.push(sensor)
  this.remoteGetValue('STATE')
}

HomeMaticHomeKitSmokeDetectorService.prototype.datapointEvent = function (dp, newValue) {
  if (this.isDataPointEvent(dp, 'STATE')) {
    this.detectorstate.updateValue(this.isTrue(newValue) ? 1 : 0, null)
  }
}

module.exports = HomeMaticHomeKitSmokeDetectorService
