'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitThermometerService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitThermometerService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitThermometerService, HomeKitGenericService);


HomeMaticHomeKitThermometerService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    this.usecache = false;
    var thermo = new Service.TemperatureSensor(this.name);
    this.services.push(thermo);

    var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
    .setProps({ minValue: -100 })
    .on('get', function(callback) {
      this.remoteGetValue("TEMPERATURE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["TEMPERATURE"] = cctemp;
    cctemp.eventEnabled = true;

   this.remoteGetValue("TEMPERATURE");
}



module.exports = HomeMaticHomeKitThermometerService; 