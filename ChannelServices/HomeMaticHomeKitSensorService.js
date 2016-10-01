'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitSensorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitSensorService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitSensorService, HomeKitGenericService);


HomeMaticHomeKitSensorService.prototype.createDeviceService = function(Service, Characteristic) {

    var that=this
    if (this.special=="DOOR") {

      var door = new Service["DoorStateService"](this.name);
      var cdoor = door.getCharacteristic(Characteristic.CurrentDoorState);
      
      cdoor.on('get', function(callback) {
      that.query("SENSOR",function(value){
       if (callback) callback(null,value);
      });
      }.bind(this));
      
      
      this.currentStateCharacteristic["SENSOR"] = cdoor;
      cdoor.eventEnabled = true;
      
      this.addValueMapping("SENSOR",0,1);
      this.addValueMapping("SENSOR",1,0);

      this.addValueMapping("SENSOR",false,1);
      this.addValueMapping("SENSOR",true,0);

      this.services.push(door);

    } else {

      var contact = new Service["ContactSensor"](this.name);
      var state = contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function(callback) {
      that.query("SENSOR",function(value){
       callback(null,value);
      });
      }.bind(this));
      
      that.currentStateCharacteristic["SENSOR"] = state;
      state.eventEnabled = true;
      this.services.push(contact);
    }

    this.remoteGetValue("SENSOR");

}



module.exports = HomeMaticHomeKitSensorService; 