'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitRaindetectorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitRaindetectorService.super_.apply(this, arguments);
}


util.inherits(HomeMaticHomeKitRaindetectorService, HomeKitGenericService);


   
HomeMaticHomeKitRaindetectorService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
  	
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
  

}



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