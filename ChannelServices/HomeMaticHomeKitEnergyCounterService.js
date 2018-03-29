'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
const inherits = require('util').inherits
var moment = require('moment');

function HomeMaticHomeKitEnergyCounterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitEnergyCounterService.super_.apply(this, arguments);
}

inherits(HomeMaticHomeKitEnergyCounterService, HomeKitGenericService);

HomeMaticHomeKitEnergyCounterService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitEnergyCounterService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  // Enable the Logging Service for Energy
  this.enableLoggingService("energy");

  var sensor = new Service.PowerMeterService(this.name);

  this.power = sensor.getCharacteristic(Characteristic.PowerCharacteristic)
  .on('get', function(callback) {
    that.query("POWER",function(value){
      that.addLogEntry({power:parseFloat(value)})
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.power.eventEnabled = true;

  this.energyCounter = sensor.getCharacteristic(Characteristic.PowerConsumptionCharacteristic)
  .on('get', function(callback) {
    that.query("ENERGY_COUNTER",function(value){
      // CCU sends wH -- homekit haz kwh - so calculate /1000
      value = (value / 1000)
      if (callback) callback(null,Number(value).toFixed(2));
    });
  }.bind(this));

  this.energyCounter.eventEnabled = true;
  this.platform.registerAdressForEventProcessingAtAccessory(this.adress,this)

  this.services.push(sensor);
  this.queryData();
}


HomeMaticHomeKitEnergyCounterService.prototype.queryData = function() {
  var that = this;
  this.query("POWER",function(value){
    that.addLogEntry({power:parseFloat(value)})
    that.power.updateValue(value,null)
  });

  this.query("ENERGY_COUNTER",function(value){
    value = (value / 1000)
    that.energyCounter.updateValue(Number(value).toFixed(2),null)
  });
  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}


HomeMaticHomeKitEnergyCounterService.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='POWER') {
    that.power.updateValue(newValue,null)
    that.addLogEntry({power:parseFloat(value)})
  }

  if (dp=='ENERGY_COUNTER') {
    // CCU sends wH -- homekit haz kwh - so calculate /1000
    let value = (newValue / 1000)
    that.energyCounter.updateValue(Number(value).toFixed(2),null)
  }
}

module.exports = HomeMaticHomeKitEnergyCounterService;
