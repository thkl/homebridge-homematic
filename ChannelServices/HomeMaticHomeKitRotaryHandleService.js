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
      
      this.addValueMapping("STATE",0,0);
      this.addValueMapping("STATE",1,100);
      this.addValueMapping("STATE",2,100);

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
      	if (value==undefined) {
          value = 0;
        }
		if (callback) callback(null,value);
      	});
      }.bind(this));

      this.currentStateCharacteristic["STATE"] = cdoor;
      cdoor.eventEnabled = true;
      this.addValueMapping("STATE",0,1);
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
      this.services.push(contact);
    }

    this.remoteGetValue("STATE");


}



module.exports = HomeMaticHomeKitRotaryHandleService; 