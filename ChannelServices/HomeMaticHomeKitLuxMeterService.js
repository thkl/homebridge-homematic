'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitLuxMeterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitLuxMeterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitLuxMeterService, HomeKitGenericService);


HomeMaticHomeKitLuxMeterService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var brightness = new Service["LightSensor"](this.name);
	this.services.push(brightness); 
	var cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function(callback) {
         that.query("LUX",function(value){
	         var fvalue = value.toFixed(2)
	         if ((fvalue>0.0001) && (fvalue<100000) && (callback))
	         {
		         callback(null,fvalue)
	         }
         });
     }.bind(this));
 
     this.currentStateCharacteristic["LUX"] = cbright;
     cbright.eventEnabled= true;

}



module.exports = HomeMaticHomeKitLuxMeterService; 