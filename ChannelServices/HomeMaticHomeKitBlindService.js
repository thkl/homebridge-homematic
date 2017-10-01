'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitBlindService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitBlindService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitBlindService, HomeKitGenericService);


HomeMaticHomeKitBlindService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var blind = new Service["WindowCovering"](this.name);
    this.services.push(blind);

    this.currentPos = blind.getCharacteristic(Characteristic.CurrentPosition)

    .on('get', function(callback) {
      that.query("LEVEL",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["LEVEL"] = this.currentPos;
    this.currentPos.eventEnabled = true;


    this.targetPos = blind.getCharacteristic(Characteristic.TargetPosition)
    
    .on('get', function(callback) {
		that.query("LEVEL",function(value){
			if (callback) {
				callback(null,value);
			}
		})
    }.bind(this))
    
        
    .on('set', function(value, callback) {
      that.delayed("set", "LEVEL", value, 750);
      callback();
    }.bind(this));

    this.pstate = blind.getCharacteristic(Characteristic.PositionState)
	
	
/**
	Parameter DIRECTION
 0 = NONE (Standard) 
 1 = UP
 2 = DOWN
 3 = UNDEFINED
*/
	
	.on('get', function(callback) {
      that.query("DIRECTION",function(value){
       if (callback) {
	      var result = 2;
          if (value!=undefined) {
	      	switch (value) {   
	         case 0:
			 	result = 2 // Characteristic.PositionState.STOPPED
			 	break
			 case 1:
			 	result = 0 // Characteristic.PositionState.DECREASING
			 	break;
			 case 2:
			 	result = 1 // Characteristic.PositionState.INCREASING
			 	break;
			 case 3:
			 	result = 2 // Characteristic.PositionState.STOPPED
			 	break;
			}
            callback(null,result);
          } else {
            callback(null,"0");
          }
       }
      });
    }.bind(this));

    this.remoteGetValue("LEVEL");
    this.remoteGetValue("DIRECTION");
	this.deviceAdress = this.adress.slice(0, this.adress.indexOf(":"));
}

HomeMaticHomeKitBlindService.prototype.endWorking=function()  {
 let that = this
 this.remoteGetValue("LEVEL",function(value) {
 	that.currentPos.updateValue(value,null);
 	that.targetPos.updateValue(value,null);
 })
}

HomeMaticHomeKitBlindService.prototype.datapointEvent=function(dp,newValue)  {
  let that = this
  if (dp == "DIRECTION") {
	 switch (newValue) {
		 case 0:
		 	this.pstate.updateValue(2,null);
		 	break;
		 case 1:
		 	this.pstate.updateValue(0,null);
		 	break;
		 case 2:
		 	this.pstate.updateValue(1,null);
		 	break;
		 case 3:
		 	this.pstate.updateValue(2,null);
		 	break;
	 } 
  }
}

module.exports = HomeMaticHomeKitBlindService; 