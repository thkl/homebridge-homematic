'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');

function HomeMaticHomeKitPowerMeterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPowerMeterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitPowerMeterService, HomeKitGenericService);

HomeMaticHomeKitPowerMeterService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitPowerMeterService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.enableLoggingService("energy");
  this.log.info("generating %s",this.adress)
  var sensor = new Service["PowerMeterService"](this.name);
  var voltage = sensor.getCharacteristic(Characteristic.VoltageCharacteristic)
  .on('get', function(callback) {
    that.query("2:VOLTAGE",function(value){
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["2:VOLTAGE"] = voltage;
  voltage.eventEnabled = true;

  var current = sensor.getCharacteristic(Characteristic.CurrentCharacteristic)
  .on('get', function(callback) {
    that.query("2:CURRENT",function(value){
      if (value!=undefined) {
        if (callback) callback(null,value);
      } else {
        if (callback) callback(null,0);
      }
    });
  }.bind(this));

  this.currentStateCharacteristic["2:CURRENT"] = current;
  current.eventEnabled = true;

  var power = sensor.getCharacteristic(Characteristic.PowerCharacteristic)
  .on('get', function(callback) {
    that.query("2:POWER",function(value){
      that.addLogEntry({power:parseFloat(value)})
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["2:POWER"] = power;
  power.eventEnabled = true;


  this.services.push(sensor);

  this.addValueFactor("CURRENT",0.001);

  var outlet = new Service["Outlet"](this.name);
  outlet.getCharacteristic(Characteristic.OutletInUse)
  .on('get', function(callback) {
    if (callback) callback(null,1);
  }.bind(this));


  var cc = outlet.getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    that.query("1:STATE",function(value){
      that.log.debug("State is %s",value);
      if (callback) callback(null,value);
    });
  }.bind(this))

  .on('set', function(value, callback) {

    if (that.readOnly==false) {
      if (value==0) {
        that.delayed("set","1:STATE" , false)
      } else {
        that.delayed("set","1:STATE" , true)
      }
    }
    callback();
  }.bind(this));

  this.currentStateCharacteristic["2:STATE"] = cc;
  cc.eventEnabled = true;

  this.addValueMapping("1:STATE",true,1);
  this.addValueMapping("1:STATE",false,0);

  this.remoteGetValue("1:STATE");

  this.services.push(outlet);

  this.cadress = this.adress.replace(":2",":1");
  this.queryData();
}


HomeMaticHomeKitPowerMeterService.prototype.queryData = function() {
  var that = this;
  this.query("2:POWER",function(value){
    that.addLogEntry({power:parseFloat(value)})
  });
  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}
if (this.loggingService != undefined) {
HomeMaticHomeKitPowerMeterService.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='2:POWER') {
    that.addLogEntry({power:parseFloat(value)})
  }
}
}
module.exports = HomeMaticHomeKitPowerMeterService;
