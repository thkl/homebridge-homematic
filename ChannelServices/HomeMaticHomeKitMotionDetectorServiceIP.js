'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')

function HomeMaticHomeKitMotionDetectorServiceIP (log, platform, id, name, type, adress, special, cfg, Service, Characteristic) {
  HomeMaticHomeKitMotionDetectorServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitMotionDetectorServiceIP, HomeKitGenericService)

HomeMaticHomeKitMotionDetectorServiceIP.prototype.createDeviceService = function (Service, Characteristic) {
  var that = this

  this.enableLoggingService('motion')

  var sensor = new Service.MotionSensor(this.name)
  this.cMotion = sensor.getCharacteristic(Characteristic.MotionDetected)
    .on('get', function (callback) {
      that.query('MOTION', function (value) {
        that.addLogEntry({
          status: (value === true) ? 1 : 0
        })
        if (callback) callback(null, value)
      })
    })

  this.cMotion.eventEnabled = true
  this.services.push(sensor)
  this.remoteGetValue('MOTION')

  if (this.deviceType !== 'HmIP-SAM') {
    var brightness = new Service.LightSensor(this.name)
    this.cBrightness = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function (callback) {
        that.query('ILLUMINATION', function (value) {
          callback(null, value)
        })
      })

    // Change max Lux to 100

    this.cBrightness.setProps({
      format: Characteristic.Formats.FLOAT,
      unit: Characteristic.Units.LUX,
      maxValue: 100,
      minValue: 0.0001,
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    })

    this.cBrightness.eventEnabled = true
    this.services.push(brightness)
  }

  this.addTamperedCharacteristic(sensor, Characteristic)
  this.addLowBatCharacteristic(sensor, Characteristic)
}

HomeMaticHomeKitMotionDetectorServiceIP.prototype.datapointEvent = function (dp, newValue) {
  if ((dp === 'MOTION') || (dp === '1.MOTION')) {
    let status = (newValue === true) ? 1 : 0
    this.addLogEntry({
      status: status
    })
    this.log.debug('[MDSIP] Motion: %s', newValue)
    this.cMotion.updateValue(newValue, null)
  }

  if ((dp === 'ILLUMINATION') ||  (dp === '1.ILLUMINATION')) {
    this.cBrightness(parseFloat(newValue), null)
  }
}

module.exports = HomeMaticHomeKitMotionDetectorServiceIP
