'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitWeatherStationService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  
  HomeMaticHomeKitWeatherStationService.super_.apply(this, arguments);
  
}

HomeMaticHomeKitWeatherStationService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
    var uuid = homebridge.uuid;
  
  Characteristic.IsRainingCharacteristic = function() {
    var charUUID = uuid.generate('HomeMatic:customchar:IsRainingCharacteristic');
	Characteristic.call(this, 'Regen', charUUID);
    this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
            });
    this.value = this.getDefaultValue();
  };
  util.inherits(Characteristic.IsRainingCharacteristic, Characteristic);
  
  Service.IsRainingService = function(displayName, subtype) {
  	var servUUID = uuid.generate('HomeMatic:customchar:IsRainingService');
  	Service.call(this, displayName, servUUID, subtype);
	this.addCharacteristic(Characteristic.IsRainingCharacteristic);
  };
  
  util.inherits(Service.IsRainingService, Service);
  
  Characteristic.WindSpeedCharacteristic = function() {
    var charUUID = uuid.generate('HomeMatic:customchar:WindSpeedCharacteristic');
	Characteristic.call(this, 'Wind Geschwindigkeit', charUUID);
    this.setProps({
        format: Characteristic.Formats.FLOAT,
		unit: 'km/h',
		minStep: 0.1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
            });
    this.value = this.getDefaultValue();
  };
  util.inherits(Characteristic.WindSpeedCharacteristic, Characteristic);
  
  
  Service.WindSpeedService = function(displayName, subtype) {
  	var servUUID = uuid.generate('HomeMatic:customchar:WindSpeedService');
  	Service.call(this, displayName, servUUID, subtype);
	this.addCharacteristic(Characteristic.WindSpeedCharacteristic);
  };
  
  util.inherits(Service.WindSpeedService, Service);
  
  
  Characteristic.WindDirectionCharacteristic = function() {
    var charUUID = uuid.generate('HomeMatic:customchar:WindDirectionCharacteristic');
	Characteristic.call(this, 'Wind Richtung', charUUID);
    this.setProps({
        format: Characteristic.Formats.INTEGER,
		unit: 'Grad',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
            });
    this.value = this.getDefaultValue();
  };
  util.inherits(Characteristic.WindDirectionCharacteristic, Characteristic);
  
  
  Service.WindDirectionService = function(displayName, subtype) {
  	var servUUID = uuid.generate('HomeMatic:customchar:WindDirectionService');
  	Service.call(this, displayName, servUUID, subtype);
	this.addCharacteristic(Characteristic.WindDirectionCharacteristic);
  };
  
  util.inherits(Service.WindDirectionService, Service);
  
  Characteristic.WindRangeCharacteristic = function() {
    var charUUID = uuid.generate('HomeMatic:customchar:WindRangeCharacteristic');
	Characteristic.call(this, 'Wind Schwankungsbreite', charUUID);
    this.setProps({
        format: Characteristic.Formats.INTEGER,
		unit: 'Grad',
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
            });
    this.value = this.getDefaultValue();
  };
  util.inherits(Characteristic.WindRangeCharacteristic, Characteristic);
  
  
  Service.WindRangeService = function(displayName, subtype) {
  	var servUUID = uuid.generate('HomeMatic:customchar:WindRangeService');
  	Service.call(this, displayName, servUUID, subtype);
	this.addCharacteristic(Characteristic.WindRangeCharacteristic);
  };
  
  util.inherits(Service.WindRangeService, Service);
  

}

util.inherits(HomeMaticHomeKitWeatherStationService, HomeKitGenericService);


HomeMaticHomeKitWeatherStationService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var thermo = new Service["TemperatureSensor"](this.name);
    this.services.push(thermo);

    var ctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({ minValue: -100 })
    .on('get', function(callback) {
      that.query("TEMPERATURE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["TEMPERATURE"] = ctemp;
    ctemp.eventEnabled = true;

	var humidity = new Service["HumiditySensor"](this.name);
 	  this.services.push(humidity);
 	    
      var chum = humidity.getCharacteristic(Characteristic.CurrentRelativeHumidity)
      .on('get', function(callback) {
         that.query("HUMIDITY",function(value){
            if (callback) callback(null,value);
         });
     }.bind(this));
 
     this.currentStateCharacteristic["HUMIDITY"] = chum;
     chum.eventEnabled= true;

	 var brightness = new Service["LightSensor"](this.name);
 	  this.services.push(brightness);
 	    
      var cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function(callback) {
         that.query("BRIGHTNESS",function(value){
            if (callback) callback(null,value);
         });
     }.bind(this));

    
     this.currentStateCharacteristic["BRIGHTNESS"] = cbright;
     cbright.eventEnabled= true;
	 
	var rain= new Service["IsRainingService"](this.name);
    this.services.push(rain);
	var crain = rain.getCharacteristic(Characteristic.IsRainingCharacteristic)
      .on('get', function(callback) {
         this.query("RAINING",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))
	  
	 this.currentStateCharacteristic["RAINING"] = crain;
     crain.eventEnabled= true;  
	 
	var windspeed= new Service["WindSpeedService"](this.name);
    this.services.push(windspeed);
	var cwindspeed = windspeed.getCharacteristic(Characteristic.WindSpeedCharacteristic)
      .on('get', function(callback) {
         this.query("WIND_SPEED",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))
	  
	 this.currentStateCharacteristic["WINDSPEED"] = cwindspeed;
     cwindspeed.eventEnabled= true;  
	 
	var winddirection= new Service["WindDirectionService"](this.name);
    this.services.push(winddirection);
	var cwinddirection = winddirection.getCharacteristic(Characteristic.WindDirectionCharacteristic)
      .on('get', function(callback) {
         this.query("WIND_DIRECTION",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))
	  
	 this.currentStateCharacteristic["WIND_DIRECTION"] = cwinddirection;
     cwinddirection.eventEnabled= true;  
	 
	var windrange= new Service["WindRangeService"](this.name);
    this.services.push(windrange);
	var cwindrange = windrange.getCharacteristic(Characteristic.WindRangeCharacteristic)
      .on('get', function(callback) {
         this.query("WIND_DIRECTION_RANGE",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))
	  
	 this.currentStateCharacteristic["WIND_DIRECTION_RANGE"] = cwindrange;
     cwindrange.eventEnabled= true;  


}



module.exports = HomeMaticHomeKitWeatherStationService; 