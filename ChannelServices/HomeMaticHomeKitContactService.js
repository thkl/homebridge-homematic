'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitContactService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitContactService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitContactService, HomeKitGenericService);


HomeMaticHomeKitContactService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
}

HomeMaticHomeKitContactService.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this;

  this.enableLoggingService("door");

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

    
    var twindow = window.getCharacteristic(Characteristic.TargetPosition);
    twindow.on('get', function(callback) {
    that.query("STATE",function(value){
     if (callback) {
       var cbvalue = 0;
       if (value>0) {cbvalue = 100;}
       callback(null,cbvalue);
     }
    });
    }.bind(this));
    
  this.targetCharacteristic = twindow;

    this.addValueMapping("STATE",0,0);
 	  this.addValueMapping("STATE",1,100);
 	  this.addValueMapping("STATE",false,0);
    this.addValueMapping("STATE",true,100);
    
    var swindow = window.getCharacteristic(Characteristic.PositionState);
    swindow.on('get', function(callback) {
     if (callback) callback(null, Characteristic.PositionState.STOPPED);
    }.bind(this));
    
    this.services.push(window);

  } else 

if (this.special=="DOOR") {

    var door = new Service["Door"](this.name);
    var cdoor = door.getCharacteristic(Characteristic.CurrentPosition);
    cdoor.on('get', function(callback) {
    that.query("STATE",function(value){
     if (callback) callback(null,value);
    });
    }.bind(this));
    
    
    this.currentStateCharacteristic["STATE"] = cdoor;
    cdoor.eventEnabled = true;
    
    var tdoor = door.getCharacteristic(Characteristic.TargetPosition);
    tdoor.on('get', function(callback) {
    that.query("STATE",function(value){
     if (callback) callback(null,value);
    });
    }.bind(this));
    
    this.targetCharacteristic = tdoor;

	  
	  this.addValueMapping("STATE",0,0);
 	  this.addValueMapping("STATE",1,100);
 	  this.addValueMapping("STATE",false,0);
    this.addValueMapping("STATE",true,100);
    
    this.services.push(door);
  
  } else {

    var contact = new Service.ContactSensor(this.name);
    var state = contact.getCharacteristic(Characteristic.ContactSensorState)
    .on('get', function(callback) {
    that.query("STATE",function(value){
    
     if (reverse == true) {
       that.log("Reverse from " + value);
     }
    
     that.addLogEntry({ status:(value==true)?1:0 });
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
    } else {
    	this.addValueMapping("STATE",true,1);
    	this.addValueMapping("STATE",false,0);
    }
    
    
 	  this.addTamperedCharacteristic(contact,Characteristic);
  this.addLowBatCharacteristic(contact,Characteristic);
    this.services.push(contact);
  }

  this.remoteGetValue("STATE");
}

HomeMaticHomeKitContactService.prototype.stateCharacteristicDidChange = function(characteristic,newValue) {
	if (characteristic.displayName=="Current Position") {
		// Set Target
		if (this.targetCharacteristic) {
			this.targetCharacteristic.setValue(newValue, null);
		}
	}
}


module.exports = HomeMaticHomeKitContactService; 