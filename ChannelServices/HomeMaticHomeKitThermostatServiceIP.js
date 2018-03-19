'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');

function HomeMaticHomeKitIPThermostatService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitIPThermostatService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitIPThermostatService, HomeKitGenericService);


HomeMaticHomeKitIPThermostatService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.usecache = false;
  var thermo = new Service["Thermostat"](this.name);
  this.services.push(thermo);
  this.enableLoggingService("thermo");

  var mode = thermo.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
  .on('get', function(callback) {

    this.query("SET_POINT_TEMPERATURE",function(value) {
      if (value<6.0){
        that.currentStateCharacteristic["CONTROL_MODE"].setValue(1, null);
        if (callback) callback(null,0);
      } else {
        that.currentStateCharacteristic["CONTROL_MODE"].setValue(0, null);
        if (callback) callback(null,1);
      }
    });


  }.bind(this));

  this.currentStateCharacteristic["CONTROL_MODE"] = mode;
  mode.eventEnabled = true;

  var targetMode = thermo.getCharacteristic(Characteristic.TargetHeatingCoolingState)
  .on('get', function(callback) {

    this.query("SET_POINT_TEMPERATURE",function(value) {
      if (value<6.0){
        if (callback) callback(null,0);
      } else {
        if (callback) callback(null,1);
      }
    });

  }.bind(this))

  .on('set', function(value, callback) {
    if (value==0) {
      this.command("setrega", "SET_POINT_TEMPERATURE", 0);
      this.cleanVirtualDevice("SET_POINT_TEMPERATURE");
    } else {
      this.cleanVirtualDevice("SET_POINT_TEMPERATURE");
    }
    callback();
  }.bind(this));

  targetMode.setProps({
    format: Characteristic.Formats.UINT8,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY],
    maxValue: 1,
    minValue: 0,
    minStep: 1,
  });

  var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
  .setProps({ minValue: -100 })
  .on('get', function(callback) {
    this.remoteGetValue("ACTUAL_TEMPERATURE",function(value){
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["ACTUAL_TEMPERATURE"] = cctemp;
  cctemp.eventEnabled = true;


  var cchum = thermo.getCharacteristic(Characteristic.CurrentRelativeHumidity)
  .on('get', function(callback) {
    this.remoteGetValue("HUMIDITY",function(value){
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["HUMIDITY"] = cchum;
  cchum.eventEnabled = true;



  var ttemp = thermo.getCharacteristic(Characteristic.TargetTemperature)
  .setProps({ minValue: 6.0, maxValue: 30.5, minStep: 0.1 })
  .on('get', function(callback) {

    this.query("SET_POINT_TEMPERATURE",function(value) {

      if (value<6) {
        value=6;
      }
      if (value>30) {
        value=30.5;
      }
      if (callback) callback(null,value);
    });

  }.bind(this))

  .on('set', function(value, callback) {
    this.delayed("setrega", "SET_POINT_TEMPERATURE", value,500);
    callback();
  }.bind(this));

  this.currentStateCharacteristic["SET_POINT_TEMPERATURE"] = ttemp;
  ttemp.eventEnabled = true;

  thermo.getCharacteristic(Characteristic.TemperatureDisplayUnits)
  .on('get', function(callback) {
    if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
  }.bind(this));


  this.remoteGetValue("ACTUAL_TEMPERATURE");
  this.remoteGetValue("HUMIDITY");
  this.remoteGetValue("SET_POINT_TEMPERATURE");


  this.queryData()
}

HomeMaticHomeKitIPThermostatService.prototype.queryData = function() {
  var that = this;
  this.query("HUMIDITY",function(value){
    that.addLogEntry({humidity:parseFloat(value)})
  });

  this.query("ACTUAL_TEMPERATURE",function(value){
    that.addLogEntry({currentTemp:parseFloat(value)})
  });

  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}



HomeMaticHomeKitIPThermostatService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}


HomeMaticHomeKitIPThermostatService.prototype.datapointEvent= function(dp,newValue) {

  if (dp=='ACTUAL_TEMPERATURE') {
      this.addLogEntry({currentTemp:parseFloat(newValue)});
  }

  if (dp=='HUMIDITY') {
      this.addLogEntry({humidity:parseFloat(newValue)});
  }

  if (dp=='SET_POINT_TEMPERATURE') {
      that.addLogEntry({setTemp:parseFloat(newValue)});
  }

}

module.exports = HomeMaticHomeKitIPThermostatService;
