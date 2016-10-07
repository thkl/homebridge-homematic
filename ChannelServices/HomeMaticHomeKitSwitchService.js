'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitSwitchService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    
    HomeMaticHomeKitSwitchService.super_.apply(this, arguments);
   
}

util.inherits(HomeMaticHomeKitSwitchService, HomeKitGenericService);


HomeMaticHomeKitSwitchService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
	var lightbulb = null;
	
    if (this.special=="PROGRAM") {
    
      lightbulb = new Service["Outlet"](this.name);
      lightbulb.getCharacteristic(Characteristic.OutletInUse)
		.on('get', function(callback) {
        	if (callback) callback(null,1);
      	}.bind(this));
    


    this.services.push(lightbulb);
    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      if (callback) callback(null,0);
     }.bind(this))

    .on('set', function(value, callback) {
      if (value==1) {
      
        that.log("Launch Program " + that.name);
        that.command("sendregacommand","","var x=dom.GetObject(\""+that.name+"\");if (x) {x.ProgramExecute();}",function() {
    		
    	});
    	
    	setTimeout(function() {
    		cc.setValue(0, null);
    
    	},1000);
    	
      }
      callback(0);

    }.bind(this));


    
    } else {
    
    if (this.special=="OUTLET") {

      lightbulb = new Service["Outlet"](this.name);
      lightbulb.getCharacteristic(Characteristic.OutletInUse)
      .on('get', function(callback) {
        if (callback) callback(null,1);
      }.bind(this));

    } else {
    	lightbulb = new Service["Lightbulb"](this.name);
    }

    this.services.push(lightbulb);

    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("STATE",function(value){
	       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {

      var onTime = that.state['ON_TIME'];
	  if ((onTime!=undefined) && (onTime>0) && (value==1)) {
		  that.command("set","ON_TIME" , onTime)
	  }
	  if (value==0) {
		  that.delayed("set","STATE" , false)
	  } else {
		  that.delayed("set","STATE" , true)
	  }
      callback();
    }.bind(this));


    var onTimeProperties = {
           format: Characteristic.Formats.FLOAT,
           unit: Characteristic.Units.SECONDS,
           minValue: 0,
           maxValue: 3600.0, // normally defined as 85825945.6 but that`s in Hesperus inconvenient and unusable
           minStep: 1,
           perms: [Characteristic.Perms.WRITE]
         };
 
       var on_time = new Characteristic("OnTime","CEA288AC-EAC5-447A-A2DD-D684E4517440", onTimeProperties)
           .on('set', function(value, callback) {
             that.state['ON_TIME']=value;
             callback();
           }.bind(this));
 
         on_time.eventEnabled = true;
 
         lightbulb.addCharacteristic(on_time);
    
	this.remoteGetValue("STATE");

    }
    
    that.currentStateCharacteristic["STATE"] = cc;
    cc.eventEnabled = true;

}



module.exports = HomeMaticHomeKitSwitchService; 