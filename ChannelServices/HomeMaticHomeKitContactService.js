'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitContactService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitContactService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitContactService, HomeKitGenericService);


HomeMaticHomeKitContactService.prototype.propagateServices = function(Service, Characteristic) {
    
  
  Service.DoorStateService = function(displayName, subtype) {
  	Service.call(this, displayName, '5243F2EA-006C-4D68-83A0-4AF6F606136C', subtype);
    this.addCharacteristic(Characteristic.CurrentDoorState);
    this.addOptionalCharacteristic(Characteristic.Name);
  };

  util.inherits(Service.DoorStateService, Service);
}

HomeMaticHomeKitContactService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var reverse = false;
    if (this.cfg != undefined) {
     if (this.cfg["reverse"]!=undefined) {
      reverse = true;
     }
    
    }
    
    
    
    if (this.special=="WINDOW") {

      var window = new Service["Window"](this.name);
      var cwindow = window.getCharacteristic(Characteristic.CurrentPosition);
      cwindow.on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) {
         var cbvalue = 0;
         if (value>0) {cbvalue = 100;}
         callback(null,cbvalue);
       }
      });
      }.bind(this));
      
      
      this.currentStateCharacteristic["STATE"] = cwindow;
      cwindow.eventEnabled = true;
      
      if (reverse == true ) {
	    this.addValueMapping("STATE",1,0);
    	this.addValueMapping("STATE",0,100);
      	this.addValueMapping("STATE",true,0);
      	this.addValueMapping("STATE",false,100);
      } else {
      	this.addValueMapping("STATE",0,0);
     	this.addValueMapping("STATE",1,100);
      	this.addValueMapping("STATE",false,0);
      	this.addValueMapping("STATE",true,100);
      }
      

      var swindow = window.getCharacteristic(Characteristic.PositionState);
      swindow.on('get', function(callback) {
	     if (callback) callback(null, Characteristic.PositionState.STOPPED);
      }.bind(this));
      

      this.services.push(window);

    } else 

    if (this.special=="DOOR") {

      var door = new Service["DoorStateService"](this.name);
      var cdoor = door.getCharacteristic(Characteristic.CurrentDoorState);
      cdoor.on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
      }.bind(this));
      
      
      this.currentStateCharacteristic["STATE"] = cdoor;
      cdoor.eventEnabled = true;
      
      if (reverse == true) {
	     this.addValueMapping("STATE",1,1);
   		 this.addValueMapping("STATE",0,0);
   	  	 this.addValueMapping("STATE",true,1);
     	 this.addValueMapping("STATE",false,0);
      } else {
	     this.addValueMapping("STATE",0,1);
   		 this.addValueMapping("STATE",1,0);
   	  	 this.addValueMapping("STATE",false,1);
     	 this.addValueMapping("STATE",true,0);
      }

      this.services.push(door);

    } else {

      var contact = new Service["ContactSensor"](this.name);
      var state = contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function(callback) {
      that.query("STATE",function(value){
      
       if (reverse == true) {
         that.log("Reverse from " + value);
       }
      
       callback(null,value);
      });
      }.bind(this));
      
      that.currentStateCharacteristic["STATE"] = state;
      state.eventEnabled = true;
      
      if (reverse == true ) {
	    this.addValueMapping("STATE",1,0);
    	this.addValueMapping("STATE",0,100);
      	this.addValueMapping("STATE",true,0);
      	this.addValueMapping("STATE",false,100);
      }
      
      this.services.push(contact);
    }

    this.remoteGetValue("STATE");


}



module.exports = HomeMaticHomeKitContactService; 