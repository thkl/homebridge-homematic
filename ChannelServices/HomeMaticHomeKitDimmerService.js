'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var curLevel=0;
var lastLevel=0;
var onc;

function HomeMaticHomeKitDimmerService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitDimmerService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitDimmerService, HomeKitGenericService);


HomeMaticHomeKitDimmerService.prototype.createDeviceService = function(Service, Characteristic) {

    var that = this;
    var lightbulb = new Service["Lightbulb"](this.name);
    this.services.push(lightbulb);

    this.onc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
     // that.log("Get On command.");
      that.query("LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }

       that.state["LAST"] = value;
       // that.log("Ret On command. "+ value );
       if (callback) callback(null,value>0);

      });
    }.bind(this))

    .on('set', function(value, callback) {

     // that.log("Set On to " + value + " command.");


       var lastLevel = that.state["LAST"];
       if (lastLevel == undefined) {
        lastLevel = -1;
       }
	
	   if (((value==true) || ((value==1))) && ((lastLevel<1))) {
          //that.log("On Command send 100 to Level");
          that.state["LAST"]=100;
	      that.command("set","LEVEL" , 100);
       } else 
   
       if ((value==0) || (value==false)) {
          //that.log("Off Command send 0 to Level");
          that.state["LAST"]=0;
	      that.command("set","LEVEL" , 0);
       } else 
       
       if (((value==true) || ((value==1))) && ((lastLevel>0))) {
         // that.log("Do Nothing on is on");
         // Do Nothing just skip the ON Command cause the Dimmer is on
       }
       
       else {
          // that.log("Fallback set Lastlevel", lastLevel);
          that.delayed("set","LEVEL" , lastLevel,2);
       }


      callback();
    }.bind(this));


    this.brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("LEVEL",function(value){
       that.state["LAST"] = (value*100);
       if (callback) callback(null,value);
      });
      
    }.bind(this))

    .on('set', function(value, callback) {
      var lastLevel = that.state["LAST"];
      if (value!=lastLevel) {
      
        if (value==0){
       	  // set On State 
	      if ((that.onc!=undefined) && (that.onc.updateValue!=undefined)) {that.onc.updateValue(false,null);}
	    } else {
	      if ((that.onc!=undefined) && (that.onc.updateValue!=undefined)) {that.onc.updateValue(true,null);}
	    }
       
	    //that.log("Set Brightness of " + that.adress + " to " + value + " command. LastLevel is "+  lastLevel);
    	that.state["LAST"] = value;
        that.isWorking = true;
     	that.delayed("set","LEVEL" , value,5);
	  }
      if (callback)  callback();
    }.bind(this));

    that.currentStateCharacteristic["LEVEL"] = this.brightness;
    this.brightness.eventEnabled = true;

    this.remoteGetValue("LEVEL");

}


HomeMaticHomeKitDimmerService.prototype.endWorking=function()  {
 this.remoteGetValue("LEVEL");
}

HomeMaticHomeKitDimmerService.prototype.event = function(channel,dp,newValue){
	let that = this
	if (dp=='LEVEL') {
		this.onc.updateValue((newValue>0)?true:false,null)
		this.brightness.updateValue((newValue*100),null)
	}
}

module.exports = HomeMaticHomeKitDimmerService; 