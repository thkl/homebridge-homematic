'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitPowerMeterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitPowerMeterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitPowerMeterService, HomeKitGenericService);


HomeMaticHomeKitPowerMeterService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
  // Register new Characteristic or Services here
  
  	var uuid = homebridge.uuid;
  	
  	this.meterChannel = this.cfg["meterChannel"] || "6";
  	this.switchChannel = this.cfg["switchChannel"] || "3";
 
  	
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



HomeMaticHomeKitPowerMeterService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
	
    var sensor = new Service["PowerMeterService"](this.name);
    var voltage = sensor.getCharacteristic(Characteristic.VoltageCharacteristic)
	.on('get', function(callback) {
      that.query(that.meterChannel + ":VOLTAGE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic[that.meterChannel + ":VOLTAGE"] = voltage;
    voltage.eventEnabled = true;

    var current = sensor.getCharacteristic(Characteristic.CurrentCharacteristic)
	.on('get', function(callback) {
      that.query(that.meterChannel + ":CURRENT",function(value){
	    if (value!=undefined) {
			if (callback) callback(null,value);
		} else {
			if (callback) callback(null,0);
		}
      });
    }.bind(this));

    this.currentStateCharacteristic[that.meterChannel + ":CURRENT"] = current;
    current.eventEnabled = true;

    var power = sensor.getCharacteristic(Characteristic.PowerCharacteristic)
	.on('get', function(callback) {
      that.query(that.meterChannel + ":POWER",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic[that.meterChannel + ":POWER"] = power;
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
}


module.exports = HomeMaticHomeKitPowerMeterService; 