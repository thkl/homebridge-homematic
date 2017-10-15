'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitWinMaticService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitWinMaticService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitWinMaticService, HomeKitGenericService);


HomeMaticHomeKitWinMaticService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
  // Register new Characteristic or Services here
  
}



HomeMaticHomeKitWinMaticService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var window = new Service.Window(this.name);
    this.services.push(window);
    
    this.cwindow = window.getCharacteristic(Characteristic.CurrentPosition);
      
    this.cwindow.on('get', function(callback) {
      that.query("LEVEL",function(value){
       if (value < 0 )  {
        value = 0;
       }
       if (callback) callback(null,value);
    })
    }.bind(this));
   
    that.currentStateCharacteristic["LEVEL"] = this.cwindow;
    this.cwindow.eventEnabled = true;


    this.swindow = window.getCharacteristic(Characteristic.TargetPosition);
      
    this.swindow.on('set', function(value,callback) {
     if (value==0) {
     	// Lock Window on Close Event
     	value = -0.005;
     }
     that.delayed("set","LEVEL" , value)
	 callback();
    }.bind(this));



    this.wpos = window.getCharacteristic(Characteristic.PositionState);
      
    this.wpos.on('get', function(callback) {
      that.query("DIRECTION",function(value){
       var hcvalue = 0;
       hcvalue = value;
       // may there are some mappings needed
       if (callback) callback(null,hcvalue);
    })
    }.bind(this));

}

HomeMaticHomeKitWinMaticService.prototype.datapointEvent=function(dp,newValue)  {
  let that = this
  if (dp == "1:WORKING") {
	 if (newValue == false) {
	  	this.remoteGetValue("LEVEL",function(value) {
	  		that.cwindow.updateValue(value,null);
	  		that.swindow.updateValue(value,null);
 		})
	  }
  }
}


module.exports = HomeMaticHomeKitWinMaticService; 