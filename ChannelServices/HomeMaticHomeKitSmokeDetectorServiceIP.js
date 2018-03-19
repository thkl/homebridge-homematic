'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitSmokeDetectorServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitSmokeDetectorServiceIP.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitSmokeDetectorServiceIP, HomeKitGenericService);


HomeMaticHomeKitSmokeDetectorServiceIP.prototype.createDeviceService = function(Service, Characteristic) {

  let that = this;
  var sensor = new Service.SmokeSensor(this.name)
  this.memyselfandi = this.getClazzConfigValue('single_alarm',false)

  var state = sensor.getCharacteristic(Characteristic.SmokeDetected)
  .on('get', function(callback) {
    that.query("SMOKE_DETECTOR_ALARM_STATUS",function(value){

      // https://github.com/thkl/homebridge-homematic/issues/215
      // https://github.com/thkl/homebridge-homematic/issues/229
      if ((that.memyselfandi == true) && (value==1)) {
        if (callback) callback(null,value);
      } else {
        if (callback) callback(null,value);
      }

    });
  }.bind(this));

  this.currentStateCharacteristic["SMOKE_DETECTOR_ALARM_STATUS"] = state;
  state.eventEnabled = true;
  this.services.push(sensor);
  this.remoteGetValue("SMOKE_DETECTOR_ALARM_STATUS");

}

HomeMaticHomeKitSmokeDetectorServiceIP.prototype.datapointEvent=function(dp,newValue)  {
  if (dp=='SMOKE_DETECTOR_ALARM_STATUS') {

    if ((this.memyselfandi == true) && (newValue==1)) {
      if (callback) callback(null,newValue);
    } else {
      if (callback) callback(null,newValue);
    }

  }
}

module.exports = HomeMaticHomeKitSmokeDetectorServiceIP;
