'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');


function HomeMaticHomeKitThermometerService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitThermometerService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermometerService, HomeKitGenericService);


HomeMaticHomeKitThermometerService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  this.usecache = false;
  var thermo = new Service.TemperatureSensor(this.name);
  this.services.push(thermo);

  var FakeGatoHistoryService = require('./fakegato-history.js')(this.platform.homebridge);
  this.log.debug("Adding Log Service for %s",this.displayName);
  this.loggingService = new FakeGatoHistoryService("thermo", this, {storage: 'fs', path: this.platform.localCache,disableTimer:true});
  this.services.push(this.loggingService);

  var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
  .setProps({ minValue: -100 })
  .on('get', function(callback) {
    this.remoteGetValue("TEMPERATURE",function(value){
      that.loggingService.addEntry({time: moment().unix(), currentTemp:parseFloat(value)});
      if (callback) callback(null,value);
    });
  }.bind(this));

  this.currentStateCharacteristic["TEMPERATURE"] = cctemp;
  cctemp.eventEnabled = true;

  this.remoteGetValue("TEMPERATURE");
  this.queryData();
}

HomeMaticHomeKitThermometerService.prototype.queryData = function() {
  var that = this;
  this.query("TEMPERATURE",function(value){that.loggingService.addEntry({time: moment().unix(), currentTemp:parseFloat(value)})});
  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}

HomeMaticHomeKitThermometerService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}


HomeMaticHomeKitThermometerService.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='TEMPERATURE') {
    this.loggingService.addEntry({time: moment().unix(), currentTemp:parseFloat(newValue)});
  }
}

module.exports = HomeMaticHomeKitThermometerService;
