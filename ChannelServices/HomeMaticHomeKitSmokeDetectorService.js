'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitSmokeDetectorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitSmokeDetectorService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitSmokeDetectorService, HomeKitGenericService);


HomeMaticHomeKitSmokeDetectorService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var sensor = new Service["SmokeSensor"](this.name);
    var state = sensor.getCharacteristic(Characteristic.SmokeDetected)
	.on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["STATE"] = state;
    state.eventEnabled = true;
    this.services.push(sensor);
    this.remoteGetValue("STATE");

}



module.exports = HomeMaticHomeKitSmokeDetectorService; 
