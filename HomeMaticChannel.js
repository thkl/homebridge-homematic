'use strict';


function HomeMaticGenericChannel(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
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
  
  this.i_characteristic = {};

  var that = this;
  var services = [];

  if (this.isSupported()==false) {
    return;
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


  // Controls


  switch (this.type) {

    case "SWITCH":


    var lightbulb = new Service["Lightbulb"](this.name);

    if (this.special=="OUTLET") {

      lightbulb = new Service["Outlet"](this.name);
      lightbulb.getCharacteristic(Characteristic.OutletInUse)
      .on('get', function(callback) {
        if (callback) callback(null,1);
      }.bind(this));

    }

    this.services.push(lightbulb);

    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.command("set","STATE" , (value==1) ? true:false)
      callback();
    }.bind(this));

    that.currentStateCharacteristic["STATE"] = cc;
    cc.eventEnabled = true;

    this.remoteGetValue("STATE");

    break;


    case "RGBW_COLOR":
    
    var lightbulb = new Service["Lightbulb"](this.name);
    this.services.push(lightbulb);

    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("1:LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }
       if (callback) callback(null,value>0);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.command("set","1:LEVEL" , (value==1)? "1": "0");
      callback();
    }.bind(this));


    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("1:LEVEL",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.delayed("set","1:LEVEL" , value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["1:LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("1:LEVEL");

    var color = lightbulb.getCharacteristic(Characteristic.Hue)

    .on('get', function(callback) {
      that.query("2:COLOR",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.delayed("set","2:COLOR" ,value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["2:COLOR"] = color;
    color.eventEnabled = true;

    this.remoteGetValue("2:COLOR");


    break;


    case "DIMMER":
    var lightbulb = new Service["Lightbulb"](this.name);
    this.services.push(lightbulb);

    var cc = lightbulb.getCharacteristic(Characteristic.On)

    .on('get', function(callback) {
      that.query("LEVEL",function(value) {
       
       if (value==undefined) {
        value = 0;
       }
       if (callback) callback(null,value>0);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.command("set","LEVEL" , (value==1)? "1": "0");
      callback();
    }.bind(this));


    var brightness = lightbulb.getCharacteristic(Characteristic.Brightness)

    .on('get', function(callback) {
      that.query("LEVEL",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))

    .on('set', function(value, callback) {
      that.delayed("set","LEVEL" , value,100);
      callback();
    }.bind(this));

    that.currentStateCharacteristic["LEVEL"] = brightness;
    brightness.eventEnabled = true;

    this.remoteGetValue("LEVEL");

    break;

    // Window Covering
    case "BLIND":
    var blind = new Service["WindowCovering"](this.name);
    this.services.push(blind);

    var cpos = blind.getCharacteristic(Characteristic.CurrentPosition)

    .on('get', function(callback) {
      that.query("LEVEL",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["LEVEL"] = cpos;
    cpos.eventEnabled = true;


    var tpos = blind.getCharacteristic(Characteristic.TargetPosition)
    
    .on('get', function(callback) {
	if (that.state["LEVEL"] != undefined ) {
		callback(null,that.state["LEVEL"]);
	} else {
      		that.query("LEVEL",function(value){
			if (callback) {
				callback(null,value);
			}
		});
	}
    }.bind(this))
    
    .on('set', function(value, callback) {
      that.delayed("set", "LEVEL", value, 250);
      callback();
    }.bind(this));

    var pstate = blind.getCharacteristic(Characteristic.PositionState)
	
	.on('get', function(callback) {
      that.query("DIRECTION",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));
    
    this.currentStateCharacteristic["DIRECTION"] = pstate;
    pstate.eventEnabled = true;

    this.remoteGetValue("LEVEL");
    this.remoteGetValue("DIRECTION");

    break;

    case "SHUTTER_CONTACT":

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
      
      this.addValueMapping("STATE",0,1);
      this.addValueMapping("STATE",1,0);

      this.addValueMapping("STATE",false,1);
      this.addValueMapping("STATE",true,0);

      this.services.push(door);

    } else {

      var contact = new Service["ContactSensor"](this.name);
      var state = contact.getCharacteristic(Characteristic.ContactSensorState)
      .on('get', function(callback) {
      that.query("STATE",function(value){
       callback(null,value);
      });
      }.bind(this));
      
      that.currentStateCharacteristic["STATE"] = state;
      state.eventEnabled = true;
      this.services.push(contact);
    }

    this.remoteGetValue("STATE");

    break;

    case "ROTARY_HANDLE_SENSOR":

    if (this.special=="DOOR") {

      var door = new Service["DoorStateService"](this.name);
      var cdoor = door.getCharacteristic(Characteristic.CurrentDoorState);
      cdoor.on('get', function(callback) {
      	that.query("STATE",function(value){
      	that.log(that.name + " set to " + value);
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

    break;

    case "MOTION_DETECTOR":

    var sensor = new Service["MotionSensor"](this.name);
    var state = sensor.getCharacteristic(Characteristic.MotionDetected)
	.on('get', function(callback) {
      that.query("MOTION",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["MOTION"] = state;
    state.eventEnabled = true;
    this.services.push(sensor);
    this.remoteGetValue("MOTION");


    break;

    case "SMOKE_DETECTOR":

    var sensor = new Service["SmokeSensor"](this.name);
    var state = sensor.getCharacteristic(Characteristic.SmokeDetected)
	.on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["STATE"] = state;
    state.eventEnabled = true;
    this.services.push(sensor);
    this.remoteGetValue("STATE");


    break;


    case "KEYMATIC":

    var door = new Service["LockMechanism"](this.name);
    this.services.push(door);

    var cstate = door.getCharacteristic(Characteristic.LockCurrentState)

	.on('get', function(callback) {
      that.query("STATE",function(value){
       
       if ((that.state["DIRECTION"]!=undefined) && (that.state["DIRECTION"]>0)) {
          if (callback) callback(null,3);
       } else {
          if (callback) callback(null,value);
	   }
      
      });
    }.bind(this));

    //this.currentStateCharacteristic["STATE"] = cstate;
    //cstate.eventEnabled = true;

    this.addValueMapping("STATE",1,0);
    this.addValueMapping("STATE",0,1);
    this.addValueMapping("STATE",false,1);
    this.addValueMapping("STATE",true,0);


    var tstate = door.getCharacteristic(Characteristic.LockTargetState)

    .on('get', function(callback) {
      that.query("STATE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this))


    .on('set', function(value, callback) {
      that.command("setrega","STATE" , (value==1) ? 0 : 1)
      setTimeout(function() {
       that.remoteGetValue("STATE");
      },10000);
      callback();
    }.bind(this));

   // this.currentStateCharacteristic["STATE"] = tstate;
   // tstate.eventEnabled = true;


    this.remoteGetValue("STATE");

    var dopener = door.addCharacteristic(Characteristic.TargetDoorState)
    .on('get', function(callback) {
      if (callback) callback(null,1);
    }.bind(this))

    .on('set', function(value, callback) {
      if (value==0) {
	      that.command("setrega","OPEN" , "true")
    	  setTimeout(function() {
    		dopener.setValue(1, null);
      	  },2000);
      }
      
      callback(0);
    }.bind(this));


    break;


    case "WEATHER":
    case "WEATHER_TRANSMIT":
    
    var thermo = new Service["TemperatureSensor"](this.name);
    this.services.push(thermo);

    var ctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)

    .on('get', function(callback) {
      that.query("TEMPERATURE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["TEMPERATURE"] = ctemp;
    ctemp.eventEnabled = true;

    break;

    case "CLIMATECONTROL_RT_TRANSCEIVER":
    case "THERMALCONTROL_TRANSMIT":

    var thermo = new Service["Thermostat"](this.name);
    this.services.push(thermo);

    var mode = thermo.getCharacteristic(Characteristic.CurrentHeatingCoolingState)
    .on('get', function(callback) {
      
      this.query("SET_TEMPERATURE",function(value) {
         if (value==4.5){
         	that.currentStateCharacteristic["TMODE"].setValue(1, null);
			that.currentStateCharacteristic["MODE"].setValue(1, null);

           if (callback) callback(null,0);
         } else {
           if (callback) callback(null,1);
         }
      });


    }.bind(this));
    
    this.currentStateCharacteristic["MODE"] = mode;
    mode.eventEnabled = true;

    var targetMode = thermo.getCharacteristic(Characteristic.TargetHeatingCoolingState)
    .on('get', function(callback) {
      
      this.query("SET_TEMPERATURE",function(value) {
         if (value==4.5){
          if (callback) callback(null,0);
         } else {
          if (callback) callback(null,1);
         }
      });

    }.bind(this))

    .on('set', function(value, callback) {
      if (value==0) {
        this.command("setrega", "SET_TEMPERATURE", 4.5);
        this.cleanVirtualDevice("SET_TEMPERATURE");
      } else {
        this.cleanVirtualDevice("SET_TEMPERATURE");
      }
      callback();
    }.bind(this));

    targetMode.setProps({
        format: Characteristic.Formats.UINT8,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY],
	    maxValue: 1,
	    minValue: 0,
    	minStep: 1,
    });

    this.currentStateCharacteristic["TMODE"] = targetMode;
    targetMode.eventEnabled = true;

    var cctemp = thermo.getCharacteristic(Characteristic.CurrentTemperature)
	.on('get', function(callback) {
      that.query("ACTUAL_TEMPERATURE",function(value){
       if (callback) callback(null,value);
      });
    }.bind(this));

    this.currentStateCharacteristic["ACTUAL_TEMPERATURE"] = cctemp;
    cctemp.eventEnabled = true;




    var ttemp = thermo.getCharacteristic(Characteristic.TargetTemperature)
    .on('get', function(callback) {
    
      this.query("SET_TEMPERATURE",function(value) {
		
		if (value==4.5){
			that.currentStateCharacteristic["TMODE"].setValue(0, null);
			that.currentStateCharacteristic["MODE"].setValue(0, null);
		} else {
			that.currentStateCharacteristic["TMODE"].setValue(1, null);
			that.currentStateCharacteristic["MODE"].setValue(1, null);
		}
	
		if (value<10) {
			value=10;
		}	
			if (callback) callback(null,value);
		});
		
		
	  this.query("CONTROL_MODE",undefined);
    }.bind(this))

    .on('set', function(value, callback) {

      if (this.state["CONTROL_MODE"]!=1) {
        this.delayed("setrega", "MANU_MODE",value,500);
        this.state["CONTROL_MODE"]=1; // set to Manual Mode
      } else {
        this.delayed("setrega", "SET_TEMPERATURE", value,500);
      }
      callback();

    }.bind(this));
    
    this.currentStateCharacteristic["SET_TEMPERATURE"] = ttemp;
    ttemp.eventEnabled = true;

    thermo.getCharacteristic(Characteristic.TemperatureDisplayUnits)
    .on('get', function(callback) {
      if (callback) callback(null, Characteristic.TemperatureDisplayUnits.CELSIUS);
    }.bind(this));

    this.cleanVirtualDevice("ACTUAL_TEMPERATURE");
    this.remoteGetValue("CONTROL_MODE");
    this.remoteGetValue("SET_TEMPERATURE");
    this.remoteGetValue("ACTUAL_TEMPERATURE");

    break;

    case "VARIABLE" :
      this.usecache = false;
      var vservice = new Service["Switch"](this.name);
      this.services.push(vservice);

      var cc = vservice.getCharacteristic(Characteristic.On)
      
      .on('get', function(callback) {
         that.remoteGetValue("STATE",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))

      .on('set', function(value, callback) {
         that.command("sendregacommand","","var x=dom.GetObject(\""+that.name+"\");if (x) {x.State("+value+");}",function() {
		   setTimeout(function() {
       			that.remoteGetValue("STATE");
      		},500);
		});
		 
         callback();
      }.bind(this));

	  this.currentStateCharacteristic["STATE"] = cc;
      cc.eventEnabled = true;
    
      this.addValueMapping("STATE",false,0);
      this.addValueMapping("STATE",true,1);
      this.remoteGetValue("STATE");
      
    break;


    case "PROGRAM_LAUNCHER" :
    var prg = new Service["ProgramLaunchService"](this.name);
    this.services.push(prg);

    var pgrl = prg.getCharacteristic(Characteristic.ProgramLaunchCharacteristic)

    .on('get', function(callback) {
      if (callback) callback(null,0);
    }.bind(this))

    .on('set', function(value, callback) {
      if (value==1) {
      
        that.log("Launch Program " + that.name);
        that.command("sendregacommand","","var x=dom.GetObject(\""+that.name+"\");if (x) {x.ProgramExecute();}",function() {
    		
    	});
    	
    	setTimeout(function() {
    		pgrl.setValue(0, null);
    
    	},1000);
    	
      }
      callback(0);
    }.bind(this));

    pgrl.eventEnabled = true;
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

    if ((this.usecache == true ) && (this.state[dp] != undefined) && (this.state[dp]!=null)) {
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
        return (value=="true") ? 1:0;
        break;
      }
    }
   
    return value;
  },


  remoteGetValue:function(dp,callback) {
    var that = this;
    var tp = this.transformDatapoint(dp);
    
    //that.platform.getValue(that.adress,dp,function(newValue) {
    
    that.platform.getValue(tp[0],tp[1],function(newValue) {
      if (newValue != undefined) {
      	if (tp[1] == 'LEVEL') {
      		newValue = newValue * 100;
      	}
      	if ((tp[1] == 'COLOR') && (that.type == "RGBW_COLOR")) {
      		newValue = Math.round((value/199)*360);
      	}
      that.eventupdate = true;
      //var ow = newValue;
      newValue = that.convertValue(dp,newValue);
      that.cache(dp,newValue);
      that.eventupdate = false;
     } else {
      newValue = 0;
     }
     
      if (callback!=undefined) {
        callback(newValue);
      } 
     
    });
  },


  event:function(dp,newValue) {
//    var tp = this.transformDatapoint(dp);
//    if (tp[1]=="LEVEL") {
//      	if (tp[1] == 'LEVEL') {
//      		newValue = newValue * 100;
//      	}
//      	if ((tp[1] == 'COLOR') && (this.type == "RGBW_COLOR")) {
//      		newValue = Math.round((value/199)*360);
//      	}
//    }
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

  cache:function(dp,value) {
    var that = this;
    
    // Check custom Mapping from HM to HomeKit
    var map = that.datapointMappings[dp];
    if (map != undefined) {
      if (map[value]!=undefined) {
        value = map[value];
      }
    }
    if (value!=undefined) {
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
    if (tp[1]=="LEVEL") {
      	if (tp[1] == 'LEVEL') {
      		newValue = newValue / 100;
      	}
      	if ((tp[1] == 'COLOR') && (this.type == "RGBW_COLOR")) {
      		newValue = Math.round((value/360)*199);
      	}
    }

    if (this.eventupdate==true) {
      return;
    }
    var that = this;

    if (mode == "set") {
      this.log("(Rpc) Send " + newValue + " to Datapoint " + tp[1] + " at " + tp[0]);
      that.platform.setValue(tp[0],tp[1],value);
    }

    if (mode == "setrega") {
	  this.log("(Rega) Send " + newValue + " to Datapoint " + tp[1] + " at " + tp[0]);
      that.platform.setRegaValue(tp[0],tp[1],value);
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


  isSupported:function() {

    return (["SWITCH","DIMMER","BLIND","CLIMATECONTROL_RT_TRANSCEIVER",
    "THERMALCONTROL_TRANSMIT","SHUTTER_CONTACT","ROTARY_HANDLE_SENSOR","MOTION_DETECTOR",
    "KEYMATIC","SMOKE_DETECTOR","WEATHER_TRANSMIT","WEATHER","PROGRAM_LAUNCHER","VARIABLE","RGBW_COLOR"].indexOf(this.type) > -1)

    return false;
  }


};

module.exports = {
  HomeMaticGenericChannel : HomeMaticGenericChannel
}
