'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");

function HomeMaticHomeKitThermostatWeatherServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitThermostatWeatherService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermostatWeatherService, HomeKitGenericService);


HomeMaticHomeKitThermostatWeatherService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  var thermo = new Service.TemperatureSensor(this.name);
  this.services.push(thermo);
  this.enableLoggingService("weather");
  this.currentTemperature = -255;
  this.currentHumidity = -255;


  var ctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
  .setProps({ minValue: -100 })
  .on('get', function(callback) {
    that.query("ACTUAL_TEMPERATURE",function(value){
      that.currentTemperature = parseFloat(value);
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["ACTUAL_TEMPERATURE"] = ctemp;
  ctemp.eventEnabled = true;

  var humidity = new Service.HumiditySensor(this.name);
  this.services.push(humidity);

  var chum = humidity.getCharacteristic(Characteristic.CurrentRelativeHumidity)
  .on('get', function(callback) {
    that.query("HUMIDITY",function(value){
      that.currentHumidity = parseFloat(value);
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["HUMIDITY"] = chum;
  chum.eventEnabled= true;
  this.queryData();
}

HomeMaticHomeKitThermostatWeatherService.prototype.queryData = function() {
  var that = this;
  this.query("ACTUAL_TEMPERATURE",function(value){
    that.currentTemperature = parseFloat(value);
    that.query("HUMIDITY",function(value){
      that.currentHumidity = parseFloat(value);
      if ((that.currentTemperature > -255) && (that.currentHumidity > -255)) {
        that.addLogEntry({temp:that.currentTemperature, pressure:0, humidity:that.currentHumidity})
      }
    });
  });
  //create timer to query device every 10 minutes
  this.refreshTimer =	setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}



HomeMaticHomeKitThermostatWeatherService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}


HomeMaticHomeKitThermostatWeatherService.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='ACTUAL_TEMPERATURE') {
    this.currentTemperature = parseFloat(newValue);
  }

  if (dp=='HUMIDITY') {
    this.currentHumidity = parseFloat(newValue);
  }

  if ((this.currentTemperature > -255) && (this.currentHumidity > -255)) {
    this.addLogEntry({ temp:this.currentTemperature, pressure:0, humidity:this.currentHumidity});
  }
}

module.exports = HomeMaticHomeKitThermostatWeatherService;
