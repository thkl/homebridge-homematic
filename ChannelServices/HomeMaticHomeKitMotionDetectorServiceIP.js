'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var moment = require('moment')

function HomeMaticHomeKitMotionDetectorServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitMotionDetectorServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitMotionDetectorServiceIP, HomeKitGenericService)


HomeMaticHomeKitMotionDetectorServiceIP.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this

  this.log.debug("Adding Log Service for %s",this.displayName);
  this.enableLoggingService("motion");

  var sensor = new Service.MotionSensor(this.name)
  var state = sensor.getCharacteristic(Characteristic.MotionDetected)
  .on('get', function(callback) {
    that.query('MOTION',function(value){
      that.addLogEntry({ status:(value==true)?1:0 });
      if (callback) callback(null,value)
    })
  }.bind(this))

  this.currentStateCharacteristic['MOTION'] = state
  state.eventEnabled = true
  this.services.push(sensor)
  this.remoteGetValue('MOTION')

  var brightness = new Service.LightSensor(this.name)
  var cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
  .on('get', function(callback) {
    that.query('ILLUMINATION',function(value){
      callback(null,value)
    })
  }.bind(this))
  
  // Change max Lux to 100

  cbright.setProps({
    format: Characteristic.Formats.FLOAT,
    unit: Characteristic.Units.LUX,
    maxValue: 100,
    minValue: 0.0001,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
  })

  this.currentStateCharacteristic['ILLUMINATION'] = cbright
  cbright.eventEnabled= true
  this.services.push(brightness)



  this.addTamperedCharacteristic(sensor,Characteristic)
  this.addLowBatCharacteristic(sensor,Characteristic)
}

HomeMaticHomeKitMotionDetectorServiceIP.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='MOTION') {
    that.addLogEntry({ status:(newValue==true)?1:0 });
  }
}

module.exports = HomeMaticHomeKitMotionDetectorServiceIP
