'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitCarbonDioxideSensorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitCarbonDioxideSensorService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitCarbonDioxideSensorService, HomeKitGenericService);


HomeMaticHomeKitCarbonDioxideSensorService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var co2sensor = new Service.CarbonDioxideSensor(this.name);
	this.services.push(co2sensor);


    this.co2level = co2sensor.getCharacteristic(Characteristic.CarbonDioxideDetected)
	.on('get', function(callback) {
      that.query("STATE",function(value){
	      var result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
	      switch value {
		      case 0:
		        result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
		        break
		      case 1:
		        result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL
		        break
		      case 2:
		        result = Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL
		        break
		  }
       if (callback) callback(null,result);
      });
    }.bind(this));

    this.setCurrentStateCharacteristic("STATE",this.co2level);
    this.remoteGetValue("STATE");

	  this.addValueMapping("STATE",0,Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
    this.addValueMapping("STATE",1,Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
    this.addValueMapping("STATE",2,Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL);

}



module.exports = HomeMaticHomeKitCarbonDioxideSensorService;
