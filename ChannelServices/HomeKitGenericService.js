'use strict';


function HomeKitGenericService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  
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
  this.usecache = true;
  this.cadress = undefined;
  this.cfg = cfg;
  this.isWorking = false;
  this.myDataPointName;
  this.i_characteristic = {};
  this.intf = cfg["interface"];
  this.datapointvaluefactors = {};
    
  var that = this;
  var services = [];

  if (that.adress.indexOf("CUxD.") > -1) {
    this.usecache = false;
  }


  if ((cfg!=undefined) && (cfg["combine"]!=undefined)) {
   var src = cfg["combine"]["source"];
   var trg = cfg["combine"]["target"];
   if (this.adress.indexOf(src)>-1) {
    this.cadress = this.adress.replace(src,trg);
   }
  }

  var informationService = new Service.AccessoryInformation();

  informationService
  .setCharacteristic(Characteristic.Manufacturer, "EQ-3")
  .setCharacteristic(Characteristic.Model, this.type)
  .setCharacteristic(Characteristic.Name, this.name)
  .setCharacteristic(Characteristic.SerialNumber, this.adress);

  this.services.push( informationService );

  if (this.propagateServices != undefined) {
      this.propagateServices(platform, Service, Characteristic);
  }
  
  this.createDeviceService(Service, Characteristic);
}




HomeKitGenericService.prototype = {

  addValueMapping: function(dp,value,mappedvalue) {
    if (this.datapointMappings[dp]==undefined) {
      this.datapointMappings[dp] = [];
    }
    this.datapointMappings[dp][value] = mappedvalue;
  } ,

  addValueFactor: function(dp,factor) {
    this.datapointvaluefactors[dp] = factor;
  } ,


  // Return current States
  query: function(dp,callback) {
    var that = this;
    if (this.usecache == false) {
      this.remoteGetValue(dp, function(value) {
      	if (callback!=undefined){callback(value);}
		});
    } else 


    if ((this.usecache == true ) && (this.state[dp] != undefined) && (this.state[dp]!=null)) {
      //that.log("Use Cache");
      if (callback!=undefined){
      callback(this.state[dp]);
      }
    } else {
      //this.log("Ask CCU");
      this.remoteGetValue(dp, function(value) {
      if (callback!=undefined){callback(value);}
    });
      //if (callback!=undefined){callback(0);}
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

  
  convertValue:function(dp,value) {
    
    var char = this.currentStateCharacteristic[dp];
    if (char!=undefined) {
      switch (char.props.format) {
		
		case "int":
	    case "uint8":
	     if (value=="true") {
	       return 1;
	     }
	     
	     if (value=="false") {
	       return 0;
	     }
	     
	     if (value==true) {
	       return 1;
	     }
	     
	     if (value==false) {
	       return 0;
	     }
	     
	    return parseInt(value);
	    
	    break;
	    
	    
	    case "uint16":
	    case "uint32":
	    return parseInt(value);
        break;

        case "float":
        return parseFloat(value);
        break;
        
        case "bool":
        if (value==true) {return 1;}
        if (value=="true") {return 1;}
        return 0;
        break;
      }
    }
   
    return value;
  },


  remoteGetValue:function(dp,callback) {
    var that = this;
    var tp = this.transformDatapoint(dp);
    var interf = this.intf; 
    //that.platform.getValue(that.adress,dp,function(newValue) {

    that.platform.getValue(interf,tp[0],tp[1],function(newValue) {
      if ((newValue != undefined) && (newValue != null)) {

      	if (tp[1] == 'LEVEL') {
      		newValue = newValue * 100;
       	}

      	if ((tp[1] == 'COLOR') && (that.type == "RGBW_COLOR")) {
      		newValue = Math.round((newValue/199)*360);
      	}

		if (tp[1] == 'BRIGHTNESS') {
			newValue = Math.pow(10,(newValue/51));
		}
      that.eventupdate = true;
      //var ow = newValue;
      newValue = that.convertValue(dp,newValue);
      that.cache(dp,newValue);
      that.eventupdate = false;
     } else {
      //newValue = 0;
      newValue = that.convertValue(dp,0)
     }



      if (callback!=undefined) {
        callback(newValue);
      } 
     
    });
  },

  endWorking:function() {
    
  },

  event:function(dp,newValue) {
  
    var that = this;
    
    var tp = this.transformDatapoint(dp);
    if (tp[1] == 'LEVEL') {
    	newValue = newValue * 100;
    }
    if ((tp[1] == 'COLOR') && (this.type == "RGBW_COLOR")) {
    	newValue = Math.round((newValue/199)*360);
    }
    if (tp[1] == 'BRIGHTNESS') {
		newValue = Math.pow(10,(newValue/51));
	}
   
    if (tp[1] == 'PRESS_SHORT') {
		var targetChar = that.currentStateCharacteristic[tp[1]];
		if (targetChar != undefined) {
			targetChar.setValue(1);
    	    setTimeout(function(){targetChar.setValue(0);}, 1000);
        }
	    return;
    }

    var factor = this.datapointvaluefactors[tp[1]];
    
    if (factor != undefined) {
	    newValue = newValue * factor;
    }

    if (dp=="WORKING") {
     if ((that.isWorking == true) && (newValue==false)) {
       that.endWorking();
     }
       that.isWorking = newValue;
    }
    
    this.eventupdate = true;
    if (this.cadress!=undefined) {
    // this is dirty shit. ok there is a config that will set the cadress to a defined channel
    // if there is an rpc event at this channel the event will be forward here.
    // now fetch the real adress of that channel and get the channelnumber
    // datapoints from such channels named  as channelnumber:datapoint ... (no better approach yet) 
       var pos = this.adress.indexOf(":");
 	   if (pos !=-1 ) {
	     var chnl = this.adress.substr(pos+1,this.adress.length);
  	     this.cache(chnl + ":" + dp,newValue);
	   }
    } else {
        this.cache(dp,newValue);
    }
    this.eventupdate = false;
  },

  mappedValue:function(dp,value) {
    var result = value;
    var map = this.datapointMappings[dp];
    if (map != undefined) {
      if (map[value]!=undefined) {
        result = map[value];
      }
    }
    return result;
  },

  cache:function(dp,value) {
    var that = this;
    
    // Check custom Mapping from HM to HomeKit
    var map = that.datapointMappings[dp];
    if (map != undefined) {
      if (map[value]!=undefined) {
        value = map[value];
      }
    }
    
    if ((value!=undefined) && (that.isWorking==false)) {

	  if (that.currentStateCharacteristic[dp]!=undefined) {
		  that.currentStateCharacteristic[dp].setValue(value, null);
      } 
    if (this.usecache) {
	    this.state[dp] = value; 
    }
    }
  },

  delayed: function(mode, dp,value,delay) {

    if (this.eventupdate==true) {
      return;
    }

    if ( this.timer[dp]!=undefined ) {
      clearTimeout(this.timer[dp]);
      this.timer[dp] = undefined;
    }


    //this.log(this.name + " delaying command "+mode + " " + dp +" with value " + value);
    var that = this;

    this.timer[dp] = setTimeout( function(){
      clearTimeout(that.timer[dp]);
      that.timer[dp] = undefined;

      that.command(mode,dp,value)
    }, delay?delay:100 );
  },

  command: function(mode,dp,value,callback) {
    var newValue = value;
    var tp = this.transformDatapoint(dp);
    if (tp[1] == 'LEVEL') {
    	newValue = newValue / 100;
    }
    if ((tp[1] == 'COLOR') && (this.type == "RGBW_COLOR")) {
    	newValue = Math.round((value / 360) * 199);
    }
    
    //newValue = String(newValue);

    if (this.eventupdate==true) {
      return;
    }
    var that = this;

    if (mode == "set") {
	  var interf = this.intf; 
	  
      this.log("(Rpc) Send " + newValue + " to Datapoint " + tp[1] + " at " + tp[0]);
      that.platform.setValue(interf,tp[0], tp[1], newValue);
    }

    if (mode == "setrega") {
	  this.log("(Rega) Send " + newValue + " to Datapoint " + tp[1] + " at " + tp[0]);
      that.platform.setRegaValue(tp[0], tp[1], newValue);
    }

    if (mode == "sendregacommand") {
      that.platform.sendRegaCommand(newValue,callback);
    }

  },


  transformDatapoint : function(dp) {
    var pos = dp.indexOf(":");
    if (pos==-1) {
      return [this.adress,dp];
    }
    var ndp = dp.substr(pos+1,dp.length);
    var nadr = this.adress.substr(0,this.adress.indexOf(":"));
    var chnl = dp.substr(0,pos);
    nadr = nadr + ":" + chnl;
    return [nadr,ndp];
  },

  getServices: function() {
    return this.services;
  } ,




};

module.exports = {
  HomeKitGenericService : HomeKitGenericService
}
