'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitMotionDetectorServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitMotionDetectorServiceIP.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitMotionDetectorServiceIP, HomeKitGenericService);


HomeMaticHomeKitMotionDetectorServiceIP.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var sensor = new Service["MotionSensor"](this.name);
    var state = sensor.getCharacteristic(Characteristic.MotionDetected)
	.on('get', function(callback) {
      that.query("MOTION",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["MOTION"] = state;
    state.eventEnabled = true;
    this.services.push(sensor);
    this.remoteGetValue("MOTION");
    
	var brightness = new Service["LightSensor"](this.name);
 	var cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
      .on('get', function(callback) {
         that.query("ILLUMINATION",function(value){
		         callback(null,fvalue/10)
         });
     }.bind(this));
 
     this.currentStateCharacteristic["ILLUMINATION"] = cbright;
     cbright.eventEnabled= true;
	 this.services.push(brightness);

}



module.exports = HomeMaticHomeKitMotionDetectorServiceIP; 