'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var sprintf = require('sprintf-js').sprintf

function HomeMaticHomeKitBatterySystemService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitBatterySystemService.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitBatterySystemService, HomeKitGenericService)

HomeMaticHomeKitBatterySystemService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this
  var trigger = this.getClazzConfigValue('trigger',undefined)
  this.variable = this.getClazzConfigValue('variable',undefined)
  this.level = 100

  if ((trigger != undefined) && (this.variable != undefined)) {
    this.log.debug('Initialize variable based BatterySystemService on %s with trigger %s',this.variable,trigger)
    var batsys = new Service.BatteryService(this.name)
    this.services.push(batsys)

    this.currentlevel = batsys.getCharacteristic(Characteristic.BatteryLevel)
    .on('set', function(value,callback) {
      if (callback) callback();
    }.bind(this))
    .on('get', function(callback) {

      if (callback) {
        callback(null,that.level)
      }
    }.bind(this))


    this.chargingState = batsys.getCharacteristic(Characteristic.ChargingState)
    .on('get', function(callback) {
      if (callback) {
        callback(null,0)
      }
    }.bind(this))

    this.lowLevelState = batsys.getCharacteristic(Characteristic.StatusLowBattery)
    .on('get', function(callback) {
      if (callback) {
        callback(null,0)
      }
    }.bind(this))

    // register for events at the trigger
    this.platform.registerAdressForEventProcessingAtAccessory(trigger,this,function(newValue){
      //just reload the variable
      that.reloadState()
    })
    // initial loading
    this.reloadState()
  } else {
    this.log.warn('cannot initialize variable based BatterySystemService trigger and/or variable missed in config')
  }
}


HomeMaticHomeKitBatterySystemService.prototype.reloadState = function() {
  let that = this
  let script = sprintf("Write(dom.GetObject('%s').State());",this.variable)
  this.command("sendregacommand","",script,function(result) {
    that.level = result
    that.log.debug("Level is %s",that.level)
    that.currentlevel.updateValue(that.level,null)
  });
}

module.exports = HomeMaticHomeKitBatterySystemService;
