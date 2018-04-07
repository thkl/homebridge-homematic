'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');
var EveHomeKitTypes = require('./EveHomeKitTypes.js');
let eve


function HomeMaticHomeKitPowerMeterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPowerMeterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitPowerMeterService, HomeKitGenericService);

HomeMaticHomeKitPowerMeterService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}


HomeMaticHomeKitPowerMeterService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
  eve = new EveHomeKitTypes(homebridge)
}


HomeMaticHomeKitPowerMeterService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.enableLoggingService("energy");
  var sensor = new eve.Service.PowerMeterService(this.name);
  this.voltage = sensor.getCharacteristic(eve.Characteristic.Voltage)
  .on('get', function(callback) {
    that.query("2:VOLTAGE",function(value){
      if (callback) callback(null,Number(value).toFixed(2));
    });
  }.bind(this));

  this.voltage.eventEnabled = true;

  this.current = sensor.getCharacteristic(eve.Characteristic.ElectricCurrent)
  .on('get', function(callback) {
    that.query("2:CURRENT",function(value){
      if (value!=undefined) {
        if (callback) callback(null,Number(value).toFixed(4));
      } else {
        if (callback) callback(null,0);
      }
    });
  }.bind(this));

  this.current.eventEnabled = true;

  this.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
  .on('get', function(callback) {
    that.query("2:POWER",function(value){
      that.addLogEntry({power:parseFloat(value)})
      if (callback) callback(null,Number(value).toFixed(2));
    });
  }.bind(this));

  this.power.eventEnabled = true;
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


  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".POWER",this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".VOLTAGE",this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".CURRENT",this)

  this.queryData();
}


HomeMaticHomeKitPowerMeterService.prototype.queryData = function() {
  var that = this;
  this.query("2:POWER",function(value){
    that.datapointEvent("2:POWER",value)
  });

  this.query("2:VOLTAGE",function(value){
    that.datapointEvent("2:VOLTAGE",value)
  });

  this.query("2:CURRENT",function(value){
    that.datapointEvent("2:CURRENT",value)
  });
  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}

HomeMaticHomeKitPowerMeterService.prototype.datapointEvent= function(dp,newValue) {

  if (dp=='2:CURRENT') {
    this.current.updateValue(Number(newValue).toFixed(4),null)
  }

  if (dp=='2:VOLTAGE') {
    this.voltage.updateValue(Number(newValue).toFixed(2),null)
  }

  if (dp=='2:POWER') {
    this.addLogEntry({power:parseFloat(newValue)})
    this.power.updateValue(Number(newValue).toFixed(2),null)
  }

}

module.exports = HomeMaticHomeKitPowerMeterService;
