'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitAlarmSystemService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitAlarmSystemService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitAlarmSystemService, HomeKitGenericService);


HomeMaticHomeKitAlarmSystemService.prototype.propagateServices = function(homebridge, Service, Characteristic) {

  // Register new Characteristic or Services here

}



HomeMaticHomeKitAlarmSystemService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
  var trigger = this.getClazzConfigValue('trigger',undefined)
  this.variable = this.getClazzConfigValue('variable',undefined)
  this.secState = 0;

  if ((trigger != undefined) && (this.variable != undefined)) {
    this.log.debug("Initialize variable based SecuritySystem on %s with trigger %s",this.variable,trigger)
    var secsys = new Service.SecuritySystem(this.name);
    this.services.push(secsys);
    this.currentState = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)
    .on('set', function(value,callback) {

      if (callback) callback();
    }.bind(this))
    .on('get', function(callback) {

      if (callback) {
        callback(null,that.secState)
      }
    }.bind(this))


    this.targetState = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)
    .on('set', function(value,callback) {
      // SetVariable
      let script =  "dom.GetObject('"+this.variable+"').State("+ value +");Write(dom.GetObject('"+this.variable+"').State());";
      this.command("sendregacommand","",script,function(result) {
        that.secState = result;
        that.currentState.updateValue(that.secState,null)
      });
      if (callback) callback();
    }.bind(this))
    .on('get', function(callback) {
      if (callback) {
        callback(null,that.secState)
      }
    }.bind(this))


    this.platform.registerAdressForEventProcessingAtAccessory(trigger,this,function(newValue){
      that.reloadState();
    });

    this.reloadState();
  } else {
    this.log.warn("Cannot initialize variable based SecuritySystem trigger and/or variable missed in config")
  }
}

/**
 * Reload the variable state and set target and current state
 *
 * Characteristic.SecuritySystemCurrentState.STAY_ARM = 0;
 * Characteristic.SecuritySystemCurrentState.AWAY_ARM = 1;
 * Characteristic.SecuritySystemCurrentState.NIGHT_ARM = 2;
 * Characteristic.SecuritySystemCurrentState.DISARMED = 3;
 * Characteristic.SecuritySystemCurrentState.ALARM_TRIGGERED = 4;
 *
 *
 * Characteristic.SecuritySystemTargetState.STAY_ARM = 0;
 * Characteristic.SecuritySystemTargetState.AWAY_ARM = 1;
 * Characteristic.SecuritySystemTargetState.NIGHT_ARM = 2;
 * Characteristic.SecuritySystemTargetState.DISARM = 3;
 * @return {[type]} [description]
 */
HomeMaticHomeKitAlarmSystemService.prototype.reloadState = function() {
  let that = this;
  let script =  "Write(dom.GetObject('"+this.variable+"').State());";
  this.command("sendregacommand","",script,function(result) {
      that.secState = result;
      // Update Characteristics
      that.currentState.updateValue(that.secState,null)
      if (that.secState < 4) {
        that.targetState.updateValue(that.secState,null)
      }
  });

}

module.exports = HomeMaticHomeKitAlarmSystemService;
