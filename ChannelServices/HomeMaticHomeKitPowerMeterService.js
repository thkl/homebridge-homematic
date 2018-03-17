'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');

function HomeMaticHomeKitPowerMeterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPowerMeterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitPowerMeterService, HomeKitGenericService);


HomeMaticHomeKitPowerMeterService.prototype.propagateServices = function(homebridge, Service, Characteristic) {

  // Register new Characteristic or Services here

  var FakeGatoHistoryService = require('./fakegato-history.js')(this.platform.homebridge);
  this.log.debug("Adding Log Service for %s",this.displayName);
  this.loggingService = new FakeGatoHistoryService("energy", this, {storage: 'fs', path: this.platform.localCache,disableTimer:true});
  this.services.push(this.loggingService);


  var uuid = homebridge.uuid;


  Characteristic.VoltageCharacteristic = function() {
    var charUUID = uuid.generate('E863F10A-079E-48FF-8F27-9C2605A29F52');
    Characteristic.call(this, 'Voltage', charUUID);
    this.setProps({
      format: Characteristic.Formats.UInt16,
      unit: "V",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };

  util.inherits(Characteristic.VoltageCharacteristic, Characteristic);


  Characteristic.CurrentCharacteristic = function() {
    var charUUID = uuid.generate('E863F126-079E-48FF-8F27-9C2605A29F52');
    Characteristic.call(this, 'Current', charUUID);
    this.setProps({
      format: Characteristic.Formats.UInt16,
      unit: "A",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };

  util.inherits(Characteristic.CurrentCharacteristic, Characteristic);

  Characteristic.PowerCharacteristic = function() {
    var charUUID = uuid.generate('E863F10D-079E-48FF-8F27-9C2605A29F52');
    Characteristic.call(this, 'Power', charUUID);
    this.setProps({
      format: Characteristic.Formats.UInt16,
      unit: "W",
      perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
  };

  util.inherits(Characteristic.PowerCharacteristic, Characteristic);



  Service.PowerMeterService = function(displayName, subtype) {
    var servUUID = uuid.generate('E863F117-079E-48FF-8F27-9C2605A29F52');
    Service.call(this, displayName, servUUID, subtype);
    this.addCharacteristic(Characteristic.VoltageCharacteristic);
    this.addCharacteristic(Characteristic.CurrentCharacteristic);
    this.addCharacteristic(Characteristic.PowerCharacteristic);
  };

  util.inherits(Service.PowerMeterService, Service);
}

HomeMaticHomeKitPowerMeterService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitPowerMeterService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;

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
      that.loggingService.addEntry({time: moment().unix(), power:parseFloat(value)});
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
  this.query("2:POWER",function(value){that.loggingService.addEntry({time: moment().unix(), power:parseFloat(value)})});
  //create timer to query device every 10 minutes
  this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}

HomeMaticHomeKitPowerMeterService.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='2:POWER') {
    this.loggingService.addEntry({time: moment().unix(), power:parseInt(newValue)});
  }
}

module.exports = HomeMaticHomeKitPowerMeterService;
