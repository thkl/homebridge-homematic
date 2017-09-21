'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitThermalControlService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitThermalControlService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermalControlService, HomeKitGenericService);


HomeMaticHomeKitThermalControlService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
  // Register new Characteristic or Services here
  
}



HomeMaticHomeKitThermalControlService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var thermo = new Service["Thermostat"](this.name);
    this.services.push(thermo);

	// this.addLowBatCharacteristic(thermo,Characteristic);

    var mode = thermo.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function(callback) {
      
      this.query("SET_TEMPERATURE",function(value) {
         if (value==4.5){
         	that.currentStateCharacteristic["TMODE"].setValue(1, null);
			that.currentStateCharacteristic["MODE"].setValue(1, null);

           if (callback) callback(null,0);
         } else {
           if (callback) callback(null,1);
         }
      });


    }.bind(this));
    
    this.currentStateCharacteristic["MODE"] = mode;
    mode.eventEnabled = true;

    var targetMode = thermo.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', function(callback) {
      
      this.query("SET_TEMPERATURE",function(value) {
         if (value==4.5){
          if (callback) callback(null,0);
         } else {
          if (callback) callback(null,1);
         }
      });

    }.bind(this))

    .on('set', function(value, callback) {
      if (value==0) {
        this.command("setrega", "SET_TEMPERATURE", 4.5);
        this.cleanVirtualDevice("SET_TEMPERATURE");
      } else {
        this.cleanVirtualDevice("SET_TEMPERATURE");
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

    this.currentStateCharacteristic["TMODE"] = targetMode;
    targetMode.eventEnabled = true;

    var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
	.on('get', function(callback) {
		that.query("ACTUAL_TEMPERATURE",function(value){
			if (callback) callback(null,value);
		});
    }.bind(this));

    this.currentStateCharacteristic["ACTUAL_TEMPERATURE"] = cctemp;
    cctemp.eventEnabled = true;

	
	if (this.type=="THERMALCONTROL_TRANSMIT") {
		var cchum = thermo.getCharacteristic(Characteristic.CurrentRelativeHumidity)
		.on('get', function(callback) {
			that.query("ACTUAL_HUMIDITY",function(value){
				if (callback) callback(null,value);
			});
		}.bind(this));
		
		this.currentStateCharacteristic["ACTUAL_HUMIDITY"] = cchum;
		cchum.eventEnabled = true;
	}

    var ttemp = thermo.getCharacteristic(Characteristic.TargetTemperature)
    .on('get', function(callback) {
    
      this.query("SET_TEMPERATURE",function(value) {
		
		if (value==4.5){
			that.currentStateCharacteristic["TMODE"].setValue(0, null);
			that.currentStateCharacteristic["MODE"].setValue(0, null);
		} else {
			that.currentStateCharacteristic["TMODE"].setValue(1, null);
			that.currentStateCharacteristic["MODE"].setValue(1, null);
		}
	
		if (value<10) {
			value=10;
		}	
			if (callback) callback(null,value);
		});
		
		
	  this.query("CONTROL_MODE",undefined);
    }.bind(this))

    .on('set', function(value, callback) {

      if (this.state["CONTROL_MODE"]!=1) {
        this.delayed("setrega", "MANU_MODE",value,500);
        this.state["CONTROL_MODE"]=1; // set to Manual Mode
      } else {
        this.delayed("setrega", "SET_TEMPERATURE", value,500);
      }
      callback();

    }.bind(this));
    
    this.currentStateCharacteristic["SET_TEMPERATURE"] = ttemp;
    ttemp.eventEnabled = true;

    thermo.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function(callback) {
      if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    }.bind(this));

    this.cleanVirtualDevice("ACTUAL_TEMPERATURE");
    this.remoteGetValue("CONTROL_MODE");
    this.remoteGetValue("SET_TEMPERATURE");
    this.remoteGetValue("ACTUAL_TEMPERATURE");
	
	if (this.type=="THERMALCONTROL_TRANSMIT") {
		this.cleanVirtualDevice("ACTUAL_HUMITIDY");
		this.remoteGetValue("ACTUAL_HUMITIDY");
	}


}



module.exports = HomeMaticHomeKitThermalControlService; 