'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitDoorBellMotionService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitDoorBellMotionService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitDoorBellMotionService, HomeKitGenericService);


HomeMaticHomeKitDoorBellMotionService.prototype.createDeviceService = function(Service, Characteristic) {
	this.log.info("Adding DoorBell as Motion Sensor");
    var that = this;
    var sensor = new Service["MotionSensor"](this.name);
    var state = sensor.getCharacteristic(Characteristic.MotionDetected)
	.on('get', function(callback) {
       if (callback) callback(null,false);
    }.bind(this));

	this.currentStateCharacteristic["PRESS_SHORT"] = state;
	state.eventEnabled = true;
	this.services.push(sensor);
	this.deviceAdress = this.adress.slice(0, this.adress.indexOf(":"));

}


HomeMaticHomeKitDoorBellMotionService.prototype.datapointEvent= function(dp,newValue) {

	 var state = sensor.getCharacteristic(Characteristic.MotionDetected)
	 if ((dp==="1:PRESS_SHORT") && (newValue===true)) {
	 	state.setValue(true,null);
	 	this.log.debug("Set Motion to true");
	 	setTimeout(function(){
		 	state.setValue(false,null);
	 	}, 1000);
	 }

}
		


module.exports = HomeMaticHomeKitDoorBellMotionService; 