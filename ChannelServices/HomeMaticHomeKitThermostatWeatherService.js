'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitThermostatWeatherService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitThermostatWeatherService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermostatWeatherService, HomeKitGenericService);


HomeMaticHomeKitThermostatWeatherService.prototype.createDeviceService = function(Service, Characteristic) {

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

}



module.exports = HomeMaticHomeKitThermostatWeatherService; 