'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitKeymaticService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitKeymaticService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitKeymaticService, HomeKitGenericService);


HomeMaticHomeKitKeymaticService.prototype.createDeviceService = function(Service, Characteristic) {

   var that = this;

    var door = new Service["LockMechanism"](this.name);
    this.services.push(door);

    var cstate = door.getCharacteristic(Characteristic.LockCurrentState)

	.on('get', function(callback) {
      that.query("STATE",function(value){
       
       if ((that.state["DIRECTION"]!=undefined) && (that.state["DIRECTION"]>0)) {
          if (callback) callback(null,3);
       } else {
          if (callback) callback(null,value);
	   }
      
      });
    }.bind(this));

    this.currentStateCharacteristic["STATE"] = cstate;
    cstate.eventEnabled = true;

    this.addValueMapping("STATE",1,0);
    this.addValueMapping("STATE",0,1);
    this.addValueMapping("STATE",false,1);
    this.addValueMapping("STATE",true,0);


    var tstate = door.getCharacteristic(Characteristic.LockTargetState)

    .on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))


    .on('set', function(value, callback) {
      that.command("setrega","STATE" , (value==1) ? 0 : 1)
      setTimeout(function() {
       that.remoteGetValue("STATE");
      },10000);
      callback();
    }.bind(this));

   // this.currentStateCharacteristic["STATE"] = tstate;
   // tstate.eventEnabled = true;


    this.remoteGetValue("STATE");

    var dopener = door.addCharacteristic(Characteristic.TargetDoorState)
    .on('get', function(callback) {
      if (callback) callback(null,1);
    }.bind(this))

    .on('set', function(value, callback) {
      if (value==0) {
	      that.command("setrega","OPEN" , "true")
    	  setTimeout(function() {
    		dopener.setValue(1, null);
      	  },2000);
      }
      
      callback(0);
    }.bind(this));




}



module.exports = HomeMaticHomeKitKeymaticService; 
