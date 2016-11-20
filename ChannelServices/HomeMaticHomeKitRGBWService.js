'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var sat;
var curLevel=0;
var lastLevel=0;
var onc;

function HomeMaticHomeKitRGBWService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitRGBWService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitRGBWService, HomeKitGenericService);


HomeMaticHomeKitRGBWService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var lightbulb = new Service.Lightbulb(this.name);
    this.services.push(lightbulb);
    
    this.onc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("1:LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }

       that.state["LAST"] = value;
       if (callback) callback(null,value>0);

      });
    }.bind(this))

    .on('set', function(value, callback) {

       var lastLevel = that.state["LAST"];
       if (lastLevel == undefined) {
        lastLevel = -1;
       }
	
	   if (((value==true) || ((value==1))) && ((lastLevel<1))) {
          that.state["LAST"]=100;
	      that.command("set","1:LEVEL" , 100);
       } else 
   
       if ((value==0) || (value==false)) {
          that.state["LAST"]=0;
	      that.command("set","1:LEVEL" , 0);
       } else 
       
       if (((value==true) || ((value==1))) && ((lastLevel>0))) {
         // Do Nothing just skip the ON Command cause the Dimmer is on
       }
       
       else {
          that.delayed("set","1:LEVEL" , lastLevel,2);
       }


      callback();
    }.bind(this));



    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("1.LEVEL",function(value){
       that.state["LAST"] = (value*100);
       if (callback) callback(null,value);
      });
      
    }.bind(this))

    .on('set', function(value, callback) {
      var lastLevel = that.state["LAST"];
      if (value!=lastLevel) {
      
        if (value==0){
       	  // set On State 
	      if ((that.onc!=undefined) && (that.onc.updateValue!=undefined)) {this.onc.updateValue(false,null);}
	    } else {
	      if ((that.onc!=undefined) && (that.onc.updateValue!=undefined)) {this.onc.updateValue(true,null);}
	    }


    	that.state["LAST"] = value;
        that.isWorking = true;
     	that.delayed("set","1:LEVEL" , value,5);
	  }
      if (callback)  callback();
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

HomeMaticHomeKitRGBWService.prototype.endWorking=function()  {
 this.remoteGetValue("1:LEVEL");
}


module.exports = HomeMaticHomeKitRGBWService; 