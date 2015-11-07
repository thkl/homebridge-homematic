'use strict';

function HomeMaticGenericChannel(log,platform, id ,name, type ,adress,special, Service, Characteristic) {
  this.name     = name;
  
  this.type     = type;
  this.adress   = adress;
  this.log      = log;
  this.platform = platform;
  this.state  	= [];
  this.eventupdate = false;
  this.special  = special;
  this.currentStateCharacteristic = [];
  this.datapointMappings = [];
  this.timer = [];
  this.services = [];
  
  this.i_characteristic = {};

  var that = this;
  var services = [];
  
  if (this.isSupported()==false) {
   return;
  }
  
  var informationService = new Service.AccessoryInformation();
    
    informationService
      .setCharacteristic(Characteristic.Manufacturer, "EQ-3")
      .setCharacteristic(Characteristic.Model, this.type)
      .setCharacteristic(Characteristic.Name, this.name)
      .setCharacteristic(Characteristic.SerialNumber, this.adress);
  
    this.services.push( informationService );
    
    
    // Controls
    
   
   switch (this.type) {
   
    case "SWITCH": 
	   var lightbulb = new Service["Lightbulb"](this.name);
	   this.services.push(lightbulb);
	   
	   var cc = lightbulb.getCharacteristic(Characteristic.On)
	   
	   .on('get', function(callback) {
	     that.query("STATE",callback);
	   }.bind(this))
	   
	   .on('set', function(value, callback) {
	     that.command("set","STATE" , (value==1) ? true:false)
	     callback();
	   }.bind(this));
	   
	   that.currentStateCharacteristic["STATE"] = cc;
       cc.eventEnabled = true;
     break; 
     
     
   case "DIMMER": 
	   var lightbulb = new Service["Lightbulb"](this.name);
	   this.services.push(lightbulb);
	   
	   var cc = lightbulb.getCharacteristic(Characteristic.On)
	   
	   .on('get', function(callback) {
	     that.query("STATE",callback);
	   }.bind(this))
	   
	   .on('set', function(value, callback) {
	     that.command("set","STATE" , (value==1) ? true:false)
	     callback();
	   }.bind(this));
	   
       
       var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

       .on('get', function(callback) {
	     that.query("LEVEL",callback);
	   }.bind(this))
	   
	   .on('set', function(value, callback) {
	     that.delayed("set","LEVEL" , String(value/100),100);
	     callback();
	   }.bind(this));

		that.currentStateCharacteristic["LEVEL"] = brightness;
       	brightness.eventEnabled = true;       
     
     break;   
   }
}




HomeMaticGenericChannel.prototype = {


  addValueMapping: function(dp,value,mappedvalue) {
    if (this.datapointMappings[dp]==undefined) {
      this.datapointMappings[dp] = [];
    }
    this.datapointMappings[dp][value] = mappedvalue;
  } ,

 // Return current States
  query: function(dp,callback) {
    var that = this;
      
      
        
    if (this.state[dp] != undefined) {
     if (callback!=undefined){callback(this.state[dp]);}
    } else {
//      that.log("No cached Value found start fetching and send temp 0 back");
      this.remoteGetValue(dp, function(value) {
        
      });
      if (callback!=undefined){callback(0);}
    }

  },

  cleanVirtualDevice:function(dp) {
     if (this.adress.indexOf("VirtualDevices.") > -1) {
    	 // Remove cached Date from Virtual Devices cause the do not update over rpc
	     this.state[dp] = undefined;
    }
    this.remoteGetValue(dp, function(value) {
        
    });
  },

  dpvalue:function(dp,fallback) {
    if (this.state[dp] != undefined) {
      return(this.state[dp]);
    } else {
      return fallback;
    }
  },

  remoteGetValue:function(dp,callback) {
      var that = this;
  	  that.platform.getValue(that.adress,dp,function(newValue) {
  	    that.log("Remote Value Response for " + that.adress + "." + dp + "->" + newValue);
  	    that.eventupdate = true;
  	    that.cache(dp,newValue);
  	    that.eventupdate = false;
  	    if (callback!=undefined) {
  	     callback(newValue);
  	    }
  	  });
  },

  
  event:function(dp,newValue) {
    
    if (dp=="LEVEL") {
      newValue = newValue*100;
    }

    this.eventupdate = true;
    this.cache(dp,newValue);
    this.eventupdate = false;
  },

  cache:function(dp,value) {
    var that = this;


	// Check custom Mapping from HM to HomeKit
    var map = this.datapointMappings[dp];
    if (map != undefined) {
      if (map[value]!=undefined) {
         value = map[value];
      }
    }
	
    if (that.currentStateCharacteristic[dp]!=undefined) {
       that.currentStateCharacteristic[dp].setValue(value, null);
    }
    this.state[dp] = value;
  },


  delayed: function(mode, dp,value,delay) {
  
   if (this.eventupdate==true) {
    return;
   }
   
    if ( this.timer[dp]!=undefined ) {
      clearTimeout(this.timer[dp]);
      this.timer[dp] = undefined;
    }
   
   
    this.log(this.name + " delaying command "+mode + " " + dp +" with value " + value);
    var that = this;
    
    this.timer[dp] = setTimeout( function(){
      clearTimeout(that.timer[dp]);
      that.timer[dp] = undefined;
      that.command(mode,dp,value)
     }, delay?delay:100 );
  },

  command: function(mode,dp,value,callback) {
   
   if (this.eventupdate==true) {
    return;
   }
   var that = this;

   if (mode == "set") {
        this.log("Send " + value + " to Datapoint " + dp + " at " + that.adress);
		that.platform.setValue(that.adress,dp,value);
   }

   if (mode == "setrega") {
        this.log("Send " + value + " to Datapoint " + dp + " at " + that.adress);
		that.platform.setRegaValue(that.adress,dp,value);
   }

   if (mode == "sendregacommand") {
		that.platform.sendRegaCommand(value,callback);
   }

  },


  getServices: function() {
    return this.services;
  } ,
  
  
  isSupported:function() {
  
    return (["SWITCH","DIMMER","BLIND","CLIMATECONTROL_RT_TRANSCEIVER",
    "THERMALCONTROL_TRANSMIT","SHUTTER_CONTACT","ROTARY_HANDLE_SENSOR","MOTION_DETECTOR",
    "KEYMATIC","SMOKE_DETECTOR","WEATHER_TRANSMIT","PROGRAM_LAUNCHER"].indexOf(this.type) > -1)
  
  /*)
    if (this.type=="SWITCH") {return true;}
    if (this.type=="DIMMER") {return true;}
    if (this.type=="BLIND") {return true;}
    if (this.type=="CLIMATECONTROL_RT_TRANSCEIVER") {return true;}
    if (this.type=="THERMALCONTROL_TRANSMIT") {return true;}
	if (this.type=="SHUTTER_CONTACT") {return true;}
	if (this.type=="ROTARY_HANDLE_SENSOR") {return true;}
	if (this.type=="MOTION_DETECTOR") {return true;}
	if (this.type=="KEYMATIC") {return true;}
	if (this.type=="SMOKE_DETECTOR") {return true;}
	if (this.type=="WEATHER_TRANSMIT") {return true;}
	if (this.type=="PROGRAM_LAUNCHER") {return true;}
  */
  return false;
  }    
   
  
};


module.exports = {
 HomeMaticGenericChannel : HomeMaticGenericChannel
}

