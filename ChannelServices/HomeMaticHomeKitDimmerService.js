'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var curLevel=0;
var lastLevel=0;

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
	      that.command("set","LEVEL" , 100);
       } else 
   
       if ((value==0) || (value==false)) {
          that.state["LAST"]=0;
	      that.command("set","LEVEL" , 0);
       } else {
          that.command("set","LEVEL" , lastLevel);
       }


      callback();
    }.bind(this));


    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("LEVEL",function(value){
       that.state["LAST"] = (value*100);
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.state["LAST"] = (value*100);
      that.isWorking = true;
      that.delayed("set","LEVEL" , value,1);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("LEVEL");

}


HomeMaticHomeKitDimmerService.prototype.endWorking=function()  {
 this.remoteGetValue("LEVEL");
}


module.exports = HomeMaticHomeKitDimmerService; 