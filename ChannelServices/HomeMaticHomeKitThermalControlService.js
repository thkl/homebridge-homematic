'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var moment = require('moment');

function HomeMaticHomeKitThermalControlService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitThermalControlService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermalControlService, HomeKitGenericService);


HomeMaticHomeKitThermalControlService.prototype.propagateServices = function(homebridge, Service, Characteristic) {

  // Register new Characteristic or Services here

}



HomeMaticHomeKitThermalControlService.prototype.createDeviceService = function(Service, Characteristic) {
	var FakeGatoHistoryService = require('./fakegato-history.js')(this.platform.homebridge);
	var that = this;
	this.log.debug("Adding Log Service for %s Adress %s",this.displayName,this.adress);
	this.loggingService = new FakeGatoHistoryService("weather", this, {storage: 'fs', path: this.platform.localPath,disableTimer:true});
	this.services.push(this.loggingService);
    this.thermostat = new Service["Thermostat"](this.name);
    this.services.push(this.thermostat);
	// init some outside values
	this.currentTemperature = -255;
	this.currentHumidity = 0;
	this.targetTemperature = -255;
	this.usecache = false; // cause of virtual devices
	// this.addLowBatCharacteristic(thermo,Characteristic);

    var mode = this.thermostat.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
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

    var targetMode = this.thermostat.getCharacteristic(Characteristic.TargetHeatingCoolingState)
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

    this.currentTemperatureCharacteristic = this.thermostat.getCharacteristic(Characteristic.CurrentTemperature)
	.on('get', function(callback) {
		that.remoteGetValue("ACTUAL_TEMPERATURE",function(value){
			that.log.info("Saving %s for %s",value,that.adress);
			that.currentTemperature = parseFloat(value);
			if (callback) callback(null,parseFloat(value));
		});
    }.bind(this));

    this.currentStateCharacteristic["ACTUAL_TEMPERATURE"] = this.currentTemperatureCharacteristic;
    this.currentTemperatureCharacteristic.eventEnabled = true;


	if (this.type=="THERMALCONTROL_TRANSMIT") {
		var cchum = this.thermostat.getCharacteristic(Characteristic.CurrentRelativeHumidity)
		.on('get', function(callback) {
			that.query("ACTUAL_HUMIDITY",function(value){
				that.currentHumidity = parseFloat(value);
				if (callback) callback(null,value);
			});
		}.bind(this));

		this.currentStateCharacteristic["ACTUAL_HUMIDITY"] = cchum;
		cchum.eventEnabled = true;
	}

    var ttemp = this.thermostat.getCharacteristic(Characteristic.TargetTemperature)
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

    this.thermostat.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function(callback) {
      if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    }.bind(this));

    this.cleanVirtualDevice("ACTUAL_TEMPERATURE");
    this.remoteGetValue("CONTROL_MODE");
    this.remoteGetValue("SET_TEMPERATURE");
    this.remoteGetValue("ACTUAL_TEMPERATURE");

	if (this.type=="THERMALCONTROL_TRANSMIT") {
		this.cleanVirtualDevice("ACTUAL_HUMIDITY");
		this.remoteGetValue("ACTUAL_HUMIDITY");
	}
	this.queryData();
}

HomeMaticHomeKitThermalControlService.prototype.queryData = function() {
	var that = this;
	this.remoteGetValue("ACTUAL_TEMPERATURE",function(value){
		that.currentTemperature = parseFloat(value);
		that.remoteGetValue("ACTUAL_HUMIDITY",function(value){
			that.currentHumidity = parseFloat(value);

			if (that.currentTemperature > -255) {
				that.loggingService.addEntry({time: moment().unix(), temp:that.currentTemperature, pressure:0, humidity:that.currentHumidity});
			}

			that.currentTemperatureCharacteristic.updateValue(that.currentTemperature,null);
	});
	});
	//create timer to query device every 10 minutes
	this.refreshTimer = setTimeout(function(){that.queryData()}, 10 * 60 * 1000);
}

HomeMaticHomeKitThermalControlService.prototype.shutdown = function() {
  clearTimeout(this.refreshTimer)
}

HomeMaticHomeKitThermalControlService.prototype.datapointEvent= function(dp,newValue) {

	if (dp=='ACTUAL_TEMPERATURE') {
		this.currentTemperature = parseFloat(newValue);
	}

	if (dp=='ACTUAL_HUMIDITY') {
		this.currentHumidity = parseFloat(newValue);
	}

	if ((this.currentTemperature > -255) && (this.currentHumidity > -255)) {
		this.loggingService.addEntry({time: moment().unix(), temp:that.currentTemperature, pressure:0, humidity:that.currentHumidity});
	}

}



module.exports = HomeMaticHomeKitThermalControlService;
