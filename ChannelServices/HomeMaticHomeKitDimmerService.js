'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var curLevel;
var lastLevel;

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
      that.query("LEVEL",function(value){
       that.curLevel = value;
       that.lastLevel = value;
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.curLevel = value;
      that.lastLevel = value;
      that.isWorking = true;
      that.delayed("set","LEVEL" , value,200);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("LEVEL");

}



module.exports = HomeMaticHomeKitDimmerService; 