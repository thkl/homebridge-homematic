'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitThermostatService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitThermostatService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermostatService, HomeKitGenericService);


HomeMaticHomeKitThermostatService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
       this.usecache = false;
    var thermo = new Service["Thermostat"](this.name);
    this.services.push(thermo);

    var mode = thermo.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function(callback) {
      
      this.query("2:SETPOINT",function(value) {
         if (value<6.0){
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
      
      this.query("2:SETPOINT",function(value) {
         if (value<6.0){
          if (callback) callback(null,0);
         } else {
          if (callback) callback(null,1);
         }
      });

    }.bind(this))

    .on('set', function(value, callback) {
      if (value==0) {
        this.command("setrega", "2:SETPOINT", 0);
        this.cleanVirtualDevice("SETPOINT");
      } else {
        this.cleanVirtualDevice("SETPOINT");
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
      this.remoteGetValue("1:TEMPERATURE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["TEMPERATURE"] = cctemp;
    cctemp.eventEnabled = true;
   
   
   var cchum = thermo.getCharacteristic(Characteristic.CurrentRelativeHumidity)
   .on('get', function(callback) {
      this.remoteGetValue("1:HUMIDITY",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["HUMIDITY"] = cchum;
    cchum.eventEnabled = true;
    

    var ttemp = thermo.getCharacteristic(Characteristic.TargetTemperature)
    .setProps({ minValue: 6.0, maxValue: 30.5, minStep: 0.1 })
	.on('get', function(callback) {
    
      this.query("2:SETPOINT",function(value) {
      
   
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
      if (value>30) {
         this.delayed("setrega", "2:SETPOINT", 100,500);
      }  else {
		this.delayed("setrega", "2:SETPOINT", value,500);
	  }
        callback();
    }.bind(this));
    
    this.currentStateCharacteristic["SETPOINT"] = ttemp;
    ttemp.eventEnabled = true;

    thermo.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function(callback) {
      if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    }.bind(this));


   this.remoteGetValue("1:TEMPERATURE");
   this.remoteGetValue("1:HUMIDITY");
   this.remoteGetValue("2:SETPOINT");
   


}



module.exports = HomeMaticHomeKitThermostatService; 