'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitSmokeDetectorServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitSmokeDetectorServiceIP.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitSmokeDetectorServiceIP, HomeKitGenericService);


HomeMaticHomeKitSmokeDetectorServiceIP.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var sensor = new Service["SmokeSensor"](this.name);
    var state = sensor.getCharacteristic(Characteristic.SmokeDetected)
	.on('get', function(callback) {
      that.query("SMOKE_DETECTOR_ALARM_STATUS",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["SMOKE_DETECTOR_ALARM_STATUS"] = state;
    state.eventEnabled = true;
    this.services.push(sensor);
    this.remoteGetValue("SMOKE_DETECTOR_ALARM_STATUS");

}



module.exports = HomeMaticHomeKitSmokeDetectorServiceIP; 