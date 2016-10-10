'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitRaindetectorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitRaindetectorService.super_.apply(this, arguments);
    
    Service.IsRainingService = function(displayName, subtype) {
  		var servUUID = uuid.generate('HomeMatic:customchar:IsRainingService');
  		Service.call(this, displayName, servUUID, subtype);
		this.addCharacteristic(Characteristic.IsRainingCharacteristic);
    };
  
    inherits(Service.IsRainingService, Service);


}

util.inherits(HomeMaticHomeKitRaindetectorService, HomeKitGenericService);


HomeMaticHomeKitRaindetectorService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var rain= new Service["IsRainingService"](this.name);
    this.services.push(rain);
	var crain = rain.getCharacteristic(Characteristic.IsRainingCharacteristic)
      .on('get', function(callback) {
         this.query("STATE",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))
	  
	 this.currentStateCharacteristic["RAINING"] = crain;
     crain.eventEnabled= true;  
		
}



module.exports = HomeMaticHomeKitRaindetectorService; 