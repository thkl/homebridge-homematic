'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var sat;
var curLevel;
var lastLevel;

function HomeMaticHomeKitRGBWService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitRGBWService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitRGBWService, HomeKitGenericService);


HomeMaticHomeKitRGBWService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var lightbulb = new Service.Lightbulb(this.name);
    this.services.push(lightbulb);

    .on('get', function(callback) {
      that.query("LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }
       that.curLevel = value;
       if (callback) callback(null,value>0);
      });
    }.bind(this))

    .on('set', function(value, callback) {
//       that.log("Value " + value + " Cur " + that.curLevel + " Last " + that.lastLevel);
       if ((value==1) && (that.curLevel==0)) {
	      that.command("set","LEVEL" , that.lastLevel);
       }
       
       if ((value==0) && ((that.curLevel>0) || (that.lastLevel > 0))) {
          that.curLevel = 0;
	      that.command("set","LEVEL" , 0);
       }


      callback();
    }.bind(this));



    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("1:LEVEL",function(value){
       that.curLevel = value;
       that.lastLevel = value;
        if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.isWorking = true;
       that.curLevel = value;
       that.lastLevel = value;
      that.delayed("set","1:LEVEL" , value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["1:LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("1:LEVEL");


    var color = lightbulb.addCharacteristic(Characteristic.Hue)
	
    .on('get', function(callback) {
      that.query("2:COLOR",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {

      if (that.sat < 10) {
        value = 361.809045226;
      }

      that.delayed("set","2:COLOR" ,value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["2:COLOR"] = color;
    color.eventEnabled = true;


    lightbulb.addCharacteristic(Characteristic.Saturation)
		.on('get', function(callback) {
		   that.query("2:COLOR",function(value){ 
		     var ret = (value==200)?0:100;
		     callback(null,ret);
		   });
		 })
		
		.on('set', function(value, callback) { 
		   that.sat = value;
		   if (value<10) {
		     that.delayed("set","2:COLOR" ,361.809045226,100);
		   }
		   callback();
		 })

    this.remoteGetValue("2:COLOR");



}



module.exports = HomeMaticHomeKitRGBWService; 