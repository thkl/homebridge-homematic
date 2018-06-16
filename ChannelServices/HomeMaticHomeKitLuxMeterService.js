'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitLuxMeterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitLuxMeterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitLuxMeterService, HomeKitGenericService);


HomeMaticHomeKitLuxMeterService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;
  var lightSensor = new Service.LightSensor(this.name);
  this.services.push(lightSensor);


  this.cbright = lightSensor.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
  .on('get', function(callback) {
    that.query("LUX",function(value){
      var fvalue = parseFloat(value).toFixed(2);
      if ((fvalue>0.0001) && (fvalue<100000) && (callback))
      {
        callback(null,fvalue)
      }
    });
  }.bind(this));

  this.cbright.eventEnabled= true;

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".LUX",this)
  this.remoteGetValue('LUX',function(newValue){
    that.processLightLevel(newValue)
  })

}

HomeMaticHomeKitLuxMeterService.prototype.processLightLevel=function(newValue)  {
  var fvalue = parseFloat(newValue).toFixed(2);
  if ((fvalue>0.0001) && (fvalue<100000)) {
    this.cbright.updateValue(fvalue,null);
  }

}


HomeMaticHomeKitLuxMeterService.prototype.datapointEvent=function(dp,newValue)  {
  if (this.isDataPointEvent(dp,"LUX")) {
    this.processLightLevel(newValue)
  }
}


module.exports = HomeMaticHomeKitLuxMeterService;
