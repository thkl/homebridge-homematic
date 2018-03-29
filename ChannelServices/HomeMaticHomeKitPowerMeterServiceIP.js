'use strict';


var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');

function HomeMaticHomeKitPowerMeterServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPowerMeterServiceIP.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitPowerMeterServiceIP, HomeKitGenericService);


HomeMaticHomeKitPowerMeterServiceIP.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.meterChannel = this.cfg["meterChannel"] || "6";
  this.switchChannel = this.cfg["switchChannel"] || "3";
  this.enableLoggingService("energy");

  var sensor = new Service.PowerMeterService(this.name);
  this.voltage = sensor.getCharacteristic(Characteristic.VoltageCharacteristic)
  .on('get', function(callback) {
    that.query(that.meterChannel + ":VOLTAGE",function(value){
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.voltage.eventEnabled = true;

  this.current = sensor.getCharacteristic(Characteristic.CurrentCharacteristic)
  .on('get', function(callback) {
    that.query(that.meterChannel + ":CURRENT",function(value){
      if (value!=undefined) {
        if (callback) callback(null,value);
      } else {
        if (callback) callback(null,0);
      }
    });
  }.bind(this));

  this.current.eventEnabled = true;

  this.power = sensor.getCharacteristic(Characteristic.PowerCharacteristic)
  .on('get', function(callback) {
    that.query(that.meterChannel + ":POWER",function(value){
      that.addLogEntry({power:parseFloat(value)});
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.power.eventEnabled = true;
  this.services.push(sensor);

  this.addValueFactor("CURRENT",0.001);

  var outlet = new Service.Outlet(this.name);
  outlet.getCharacteristic(Characteristic.OutletInUse)
  .on('get', function(callback) {
    if (callback) callback(null,1);
  }.bind(this));


  var cc = outlet.getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    that.query(that.switchChannel + ":STATE",function(value){
      that.log.debug("State is %s",value);
      if (callback) callback(null,value);
    });
  }.bind(this))

  .on('set', function(value, callback) {
    if (that.readOnly==false) {
      if (value==0) {
        that.delayed("set",that.switchChannel + ":STATE" , false)
      } else {
        that.delayed("set",that.switchChannel + ":STATE" , true)
      }
    }
    callback();
  }.bind(this));

  this.currentStateCharacteristic[that.switchChannel + ":STATE"] = cc;
  cc.eventEnabled = true;

  this.addValueMapping(that.switchChannel + ":STATE",true,1);
  this.addValueMapping(that.switchChannel + ":STATE",false,0);

  this.remoteGetValue(that.switchChannel + ":STATE");

  this.services.push(outlet);
  this.deviceAdress = this.adress.slice(0, this.adress.indexOf(":"));

  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ":" + this.meterChannel + ".POWER",this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ":" + this.meterChannel + ".VOLTAGE",this)
  this.platform.registerAdressForEventProcessingAtAccessory(this.deviceAdress + ":" + this.meterChannel + ".CURRENT",this)


  this.queryData();
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.queryData = function() {
  var that = this;
  let dps = [this.meterChannel + ":POWER",this.meterChannel + ":VOLTAGE",this.meterChannel + ":CURRENT"]
  dps.map(function(dp){
    that.query(dp,function(value){that.datapointEvent(dp,value)});
  })

  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}

HomeMaticHomeKitPowerMeterServiceIP.prototype.datapointEvent= function(dp,newValue) {
  if (dp==this.meterChannel + ":POWER") {
    this.addLogEntry({power:parseInt(newValue)});
    this.power.updateValue(newValue,null);
  }

  if (dp==this.meterChannel + ":VOLTAGE") {
    this.addLogEntry({power:parseInt(newValue)});
    this.voltage.updateValue(newValue,null);
  }

  if (dp==this.meterChannel + ":CURRENT") {
    this.addLogEntry({power:parseInt(newValue)});
    this.current.updateValue(newValue,null);
  }

}

module.exports = HomeMaticHomeKitPowerMeterServiceIP;
