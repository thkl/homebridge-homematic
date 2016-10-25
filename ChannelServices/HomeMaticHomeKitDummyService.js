'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitDummyService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitDummyService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitDummyService, HomeKitGenericService);


HomeMaticHomeKitDummyService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
  // Register new Characteristic or Services here
  
}



HomeMaticHomeKitDummyService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    // Fill Servicelogic here

}



module.exports = HomeMaticHomeKitDummyService; 