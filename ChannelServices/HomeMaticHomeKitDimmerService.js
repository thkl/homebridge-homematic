'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitDimmerService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitDimmerService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitDimmerService, HomeKitGenericService);


HomeMaticHomeKitDimmerService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var lightbulb = new Service["Lightbulb"](this.name);
    this.services.push(lightbulb);

    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }
       if (callback) callback(null,value>0);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.command("set","LEVEL" , (value==1)? "100": "0");
      callback();
    }.bind(this));


    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("LEVEL",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.delayed("set","LEVEL" , value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("LEVEL");

}



module.exports = HomeMaticHomeKitDimmerService; 