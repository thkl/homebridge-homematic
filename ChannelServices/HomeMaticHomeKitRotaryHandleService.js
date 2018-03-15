'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitRotaryHandleService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitRotaryHandleService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitRotaryHandleService, HomeKitGenericService);



HomeMaticHomeKitRotaryHandleService.prototype.createDeviceService = function(Service, Characteristic) {

     var that = this;
     if (this.special=="WINDOW") {
		
      var window = new Service.Window(this.name);
      this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition);
      this.cwindow.on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) {
         var cbvalue = 0;
         if (value>0) {cbvalue = 100;}
         callback(null,cbvalue);
       }
      });
      }.bind(this));
      
      
      this.currentStateCharacteristic["STATE"] = this.cwindow;
      this.cwindow.eventEnabled = true;
      
      this.twindow = window.getCharacteristic(Characteristic.TargetPosition);
      this.twindow.on('set',  function(value,callback) {
      	  	// This is just a sensor so reset homekit data to ccu value after 1 second playtime
	      	setTimeout(function () {
		      	that.remoteGetValue("STATE",function(value){
			      	
		      		that.processWindowSensorData(value)
		      	})
	      	}, 1000)
	      	
	    if (callback) {
	      	callback()
	    }
      }.bind(this));
      
      this.swindow = window.getCharacteristic(Characteristic.PositionState);
      this.swindow.on('get', function(callback) {
	     if (callback) callback(null, Characteristic.PositionState.STOPPED);
      }.bind(this));
      
      this.services.push(window);

    } else 


    if (this.special=="DOOR") {

      var door = new Service["Door"](this.name);
      var cdoor = door.getCharacteristic(Characteristic.CurrentPosition);
      cdoor.on('get', function(callback) {
      	that.query("STATE",function(value){
      	var hkvalue = 0;
      	if (value==undefined) {
          hkvalue = 0;
        }
        
        if (value==0) {hkvalue=100;}
        if (value==1) {hkvalue=0;}
        if (value==2) {hkvalue=0;}
        
		if (callback) callback(null,hkvalue);
      	});
      }.bind(this));

      this.currentStateCharacteristic["STATE"] = cdoor;
      cdoor.eventEnabled = true;
      
      
      this.addValueMapping("STATE",0,100);
      this.addValueMapping("STATE",1,0);
      this.addValueMapping("STATE",2,0);
      this.services.push(door);

    } else {

      var contact = new Service["ContactSensor"](this.name);
      var state = contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function(callback) {
        that.query("STATE",function(value) {
         if (callback) {callback(null,value);}
        });
      }.bind(this));
      this.currentStateCharacteristic["STATE"] = state;
      state.eventEnabled = true;
      this.addValueMapping("STATE",0,0);
      this.addValueMapping("STATE",1,1);
      this.addValueMapping("STATE",2,1);
      this.addTamperedCharacteristic(contact,Characteristic);
	  this.addLowBatCharacteristic(contact,Characteristic);
      this.services.push(contact);
    }

    this.remoteGetValue("STATE");

}

HomeMaticHomeKitRotaryHandleService.prototype.processWindowSensorData = function(newValue){
	switch (newValue) {
			case 0 : 
			  this.cwindow.updateValue(0,null)		    
			  this.swindow.updateValue(2,null)	
			  this.twindow.updateValue(0,null)
			  break;
			case 1: 
			  this.cwindow.updateValue(50,null)		    
			  this.swindow.updateValue(2,null)		    
			  this.twindow.updateValue(50,null)
			  break;
			case 2:
			  this.cwindow.updateValue(100,null)		    
			  this.swindow.updateValue(2,null)		    
			  this.twindow.updateValue(100,null)
			  break;

	}
}

HomeMaticHomeKitRotaryHandleService.prototype.event = function(channel,dp,newValue){
	// Chech sensors
	let that = this
    let event_address = channel + '.' + dp
    if ((this.cwindow != undefined) && (this.swindow != undefined)) {
	    this.processWindowSensorData(newValue)
    }
}


module.exports = HomeMaticHomeKitRotaryHandleService; 