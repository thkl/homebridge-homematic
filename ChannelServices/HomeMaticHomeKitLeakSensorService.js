'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitLeakSensorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitLeakSensorService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitLeakSensorService, HomeKitGenericService);


HomeMaticHomeKitLeakSensorService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var leak_sensor = new Service["LeakSensor"](this.name);
    var state = leak_sensor.getCharacteristic(Characteristic.LeakDetected)
	.on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));


	this.addValueMapping("STATE",0,0);
    this.addValueMapping("STATE",1,1);
    this.addValueMapping("STATE",2,1);

    this.currentStateCharacteristic["STATE"] = state;
    state.eventEnabled = true;
    this.services.push(leak_sensor);
    this.remoteGetValue("STATE");

}



module.exports = HomeMaticHomeKitLeakSensorService; 
