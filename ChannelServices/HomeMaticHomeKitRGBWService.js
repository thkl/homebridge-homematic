'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitRGBWService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitRGBWService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitRGBWService, HomeKitGenericService);


HomeMaticHomeKitRGBWService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var lightbulb = new Service["Lightbulb"](this.name);
    this.services.push(lightbulb);

    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("1:LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }
       if (callback) callback(null,value>0);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.command("set","1:LEVEL" , (value==1)? "100": "0");
      callback();
    }.bind(this));


    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("1:LEVEL",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.delayed("set","1:LEVEL" , value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["1:LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("1:LEVEL");

    var color = lightbulb.getCharacteristic(Characteristic.Hue)

    .on('get', function(callback) {
      that.query("2:COLOR",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.delayed("set","2:COLOR" ,value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["2:COLOR"] = color;
    color.eventEnabled = true;

    this.remoteGetValue("2:COLOR");



}



module.exports = HomeMaticHomeKitRGBWService; 