'use strict';

var request = require("request");
var HomeMaticRPC = require("./HomeMaticRPC.js").HomeMaticRPC;
var HomeMaticRegaRequest =  require("./HomeMaticRegaRequest.js").HomeMaticRegaRequest;
var HomeMaticChannelLoader =  require("./HomeMaticChannelLoader.js").HomeMaticChannelLoader;

var inherits = require('util').inherits;
var path = require('path');
var fs = require('fs');
var uuid;

var Service, Characteristic;

module.exports = function(homebridge) {
  uuid = homebridge.hap.uuid;
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerPlatform("homebridge-homematic", "HomeMatic", HomeMaticPlatform);
}

function HomeMaticPlatform(log, config) {
  
  this.log = log;
  this.uuid = uuid;
  this.log("Homematic Plugin Version " + this.getVersion());
  this.log("Plugin by thkl  https://github.com/thkl");
  this.log("Homematic is a registered trademark of the EQ-3 AG");
  this.log("Please report any issues to https://github.com/thkl/homebridge-homematic/issues");
  
  this.ccuIP = config["ccu_ip"];
  
  this.filter_device = config["filter_device"];
  this.filter_channel = config["filter_channel"];
  
  this.outlets = config["outlets"];
  this.iosworkaround = config["ios10"];
  this.doors = config["doors"];
  this.windows = config["windows"];
  this.variables = config["variables"];
  this.programs = config["programs"];
  this.subsection = config["subsection"];
  this.localCache = config["lcache"];
  this.vuc = config["variable_update_trigger_channel"];
  
  if ((this.subsection==undefined) || (this.subsection=="")) {
    this.log.warn("Uuhhh. There is no value for the key subsection in config.json.");
    this.log.warn("There will be no devices fetched from your ccu.");
    this.log.warn("Please create a subsection and put in all the channels,");
    this.log.warn("you want to import into homekit. Then add the name of that");
    this.log.warn("section into your config.json as \"subsection\"=\"....\".");
    return;
  }
  
  this.sendQueue = [];
  this.timer = 0;

  this.foundAccessories = [];
  this.adressesToQuery = [];
  this.config = config;
   
  var port = config["local_port"];
  if (port==undefined) {
   port = 9090;
  }
  
  this.xmlrpc = new HomeMaticRPC(this.log, this.ccuIP, port, 0, this);
  this.xmlrpc.init();
  
  if ((config["enable_wired"]!=undefined) && (config["enable_wired"]=="true")) {
	  this.xmlrpcwired = new HomeMaticRPC(this.log, this.ccuIP, port+1, 1, this);
  	  this.xmlrpcwired.init();
  }
  
  if ((config["enable_hmip"]!=undefined) && (config["enable_wired"]=="true")) {
	  this.xmlrpchmip = new HomeMaticRPC(this.log, this.ccuIP, port+2, 2, this);
  	  this.xmlrpchmip.init();
  }

  
  var that = this;
  
  process.on("SIGINT", function() {
      if (that.xmlrpc.stopping) {
        return;
      }
      that.xmlrpc.stopping = true;
      that.xmlrpc.stop();
      if (that.xmlrpcwired!=undefined) {
      	that.xmlrpcwired.stop();
      }

      if (that.xmlrpchmip!=undefined) {
      	that.xmlrpchmip.stop();
      }

      setTimeout(process.exit(0), 2000);
  });

  process.on("SIGTERM", function() {
      if (that.xmlrpc.stopping) {
        return;
      }
      that.xmlrpc.stopping = true;
      that.xmlrpc.stop();
      if (that.xmlrpcwired!=undefined) {
      	that.xmlrpcwired.stop();
      }
      if (that.xmlrpchmip!=undefined) {
      	that.xmlrpchmip.stop();
      }

      setTimeout(process.exit(0), 2000);
  });
}


HomeMaticPlatform.prototype.accessories = function(callback) {


    var that = this;
    that.foundAccessories = [];

	if ((this.subsection==undefined) || (this.subsection=="")) {
		callback(that.foundAccessories);
		return;
	}


    this.log("Fetching Homematic devices...");
    var internalconfig = this.internalConfig();
    var channelLoader = new HomeMaticChannelLoader(this.log);
    channelLoader.init(this.config["services"]);
    
    var script = "string sDeviceId;string sChannelId;boolean df = true;Write(\'{\"devices\":[\');foreach(sDeviceId, root.Devices().EnumIDs()){object oDevice = dom.GetObject(sDeviceId);if(oDevice){var oInterface = dom.GetObject(oDevice.Interface());if(df) {df = false;} else { Write(\',\');}Write(\'{\');Write(\'\"id\": \"\' # sDeviceId # \'\",\');Write(\'\"name\": \"\' # oDevice.Name() # \'\",\');Write(\'\"address\": \"\' # oDevice.Address() # \'\",\');Write(\'\"type\": \"\' # oDevice.HssType() # \'\",\');Write(\'\"channels\": [\');boolean bcf = true;foreach(sChannelId, oDevice.Channels().EnumIDs()){object oChannel = dom.GetObject(sChannelId);if(bcf) {bcf = false;} else {Write(\',\');}Write(\'{\');Write(\'\"cId\": \' # sChannelId # \',\');Write(\'\"name\": \"\' # oChannel.Name() # \'\",\');if(oInterface){Write(\'\"address\": \"\' # oInterface.Name() #\'.'\ # oChannel.Address() # \'\",\');}Write(\'\"type\": \"\' # oChannel.HssType() # \'\"\');Write(\'}\');}Write(\']}\');}}Write(\']\');";

    
     script = script + "var s = dom.GetObject(\"" ;
     script = script + this.subsection;
     script = script + "\");string cid;boolean sdf = true;if (s) {Write(\',\"subsection\":[\');foreach(cid, s.EnumUsedIDs()){ ";
     script = script +" if(sdf) {sdf = false;}";
     script = script +" else { Write(\',\');}Write(cid);}Write(\']\');}";

    script = script + "Write('\}'\);";
     
    var localcache = './.homebridge/ccu.json';

    var regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, function(data) {
	  var json;
    
      if (data != undefined) {
	     try {
	      // read Json 
	      json = JSON.parse(data)
          if ((json != undefined) && (json["devices"] != undefined)) {
			// seems to be valid json
			if ((that.localCache != undefined) && (that.localCache == "true")){
				fs.writeFile(localcache, data, function (err) {
				  if (err) {
					  that.log.warn('Cannot cache ccu data ',err);
				  }
					  that.log('will cache ccu response ...');
    	      	});
    	     }
    	     
          }
		 } catch (e) {
  				that.log.warn("Unable to parse live ccu data. Will try cache if there is one");
		 }
      }
      
      // check if we got valid json from ccu
      if ((json == undefined) && (that.localCache != undefined)) {
      // try to load Data
      
      try {
	    fs.accessSync(localcache, fs.F_OK);
    	  // try to load Data
        data = fs.readFileSync(localcache).toString();
	    if (data != undefined) {
	      try {
	       json = JSON.parse(data)
		   that.log("loaded ccu data from local cache ... WARNING: your mileage may vary");
		  } catch (e) {
  				that.log.warn("Unable to parse cached ccu data. giving up");
		  }
  	    }
       } catch (e) {
  				that.log.warn("Unable to load cached ccu data. giving up");
       }
      }

      
      if ((json != undefined) && (json["devices"] != undefined)) {
      
      
        json["devices"].map(function(device) {
        
          var cfg = that.deviceInfo(internalconfig,device["type"]);

          var isFiltered = false;

          if ((that.filter_device != undefined) && (that.filter_device.indexOf(device.address) > -1)) {
            isFiltered = true;
          } else {
            isFiltered = false;
          }
          // that.log('device address:', device.address);

          if ((device["channels"] != undefined) && (!isFiltered)) {

            device["channels"].map(function(ch) {
              
              
              var isChannelFiltered = false;
              var isSubsectionSelected = false;
			  // if we have a subsection list check if the channel is here
			  if (json["subsection"]!=undefined) {
			   var cin = (json["subsection"].indexOf(ch.cId) > -1);
			    // if not .. set filter flag
			    isChannelFiltered = !cin;
			    isSubsectionSelected = cin;
			  }

			  if ((cfg!=undefined) && (cfg["filter"]!=undefined) && (cfg["filter"].indexOf(ch.type)>-1)) {
			  	isChannelFiltered = true;
			  }

              if ((that.filter_channel != undefined) && (that.filter_channel.indexOf(ch.address) > -1)) {
                isChannelFiltered = true;
              } 
              
              
              // that.log('name', ch.name, ' -> address:', ch.address);
              if ((ch.address != undefined) && (!isChannelFiltered)) {

               
                  // Switch found
                  // Check if marked as Outlet or Door
                  var special = undefined;
                  if ((that.outlets!=undefined) && (that.outlets.indexOf(ch.address) > -1)) {special = "OUTLET";}
                  if ((that.doors!=undefined) && (that.doors.indexOf(ch.address) > -1)) {special = "DOOR";}
                  if ((that.windows!=undefined) && (that.windows.indexOf(ch.address) > -1)) {special = "WINDOW";}
                  
                  // Check if VIRTUAL KEY is Set as Variable Trigger
                  if ((that.vuc != undefined) && (ch.type=="VIRTUAL_KEY") && (ch.name == that.vuc)) {
                     that.log('Channel ' + that.vuc + ' added as Variable Update Trigger');
	    			 
                	 channelLoader.loadChannelService(that.foundAccessories,"VARIABLE_UPDATE_TRIGGER","VARIABLE_UPDATE_TRIGGER",that.log , that, ch.id, ch.name, ch.address, that.variables ,cfg, Service, Characteristic);


                  } else {
                	 channelLoader.loadChannelService(that.foundAccessories, device["type"],ch.type,that.log , that, ch.id, ch.name, ch.address, special ,cfg, Service, Characteristic);
                  }
                  

              } else {
                // Channel is in the filter
              }

            });
          } else {
            that.log(device.name + " has no channels or is filtered");
          }

        });


        if (that.programs!=undefined) {
          that.programs.map(function(program){
            
            var prgtype = ""
            
            if ((that.iosworkaround==undefined) || (that.iosworkaround!="true")) {
                that.log('Program ' + program + ' added as Program_Launcher');
                
                channelLoader.loadChannelService(that.foundAccessories, "PROGRAM_LAUNCHER","PROGRAM_LAUNCHER",that.log , that, "1234", program, "1234", "" ,undefined, Service, Characteristic);

            } else {
	            var cfg = that.deviceInfo(internalconfig,"");
                that.log('Program ' + program + ' added as SWITCH cause of IOS 10');
                channelLoader.loadChannelService(that.foundAccessories, "SWITCH","SWITCH",that.log , that, "1234", program, "1234", "PROGRAM" ,undefined, Service, Characteristic);

            }
          
          });
        }

// Add Optional Variables
      if (that.variables!=undefined) {
          that.variables.map(function(variable) {
                channelLoader.loadChannelService(that.foundAccessories, "VARIABLE","VARIABLE",that.log , that, "1234", variable, variable , "" ,undefined, Service, Characteristic);
          });
      }
/*
                	 channelLoader.loadChannelService(that.foundAccessories, "HM-Sec-Sir-WM","ARMING",that.log , that,"1234", "TestSierene", "1234", "" ,undefined, Service, Characteristic);
*/
             
        callback(that.foundAccessories);
      } else {
        callback(that.foundAccessories);
      }


		// check number of devices
		var noD = that.foundAccessories.length;
		that.log("Number of mapped devices : " + noD); 
      	if (noD > 100) {
      	    that.log.warn("********************************************");
      	    that.log.warn("* You are using more than 100 HomeKit      *");
      	    that.log.warn("* devices behind a bridge. At this time    *");
      	    that.log.warn("* HomeKit only supports up to 100 devices. *");
      	    that.log.warn("* This may end up that iOS is not able to  *");
      	    that.log.warn("* connect to the bridge anymore.           *");
      	    that.log.warn("********************************************");
      	} else 
      	
      	if (noD > 90) {
      	    that.log.warn("You are using more than 90 HomeKit");
      	    that.log.warn("devices behind a bridge. At this time");
      	    that.log.warn("HomeKit only supports up to 100 devices.");
      	    that.log.warn("This is just a warning. Everything should");
      	    that.log.warn("work fine until you are below that 100.");
      	}
    });
 
 
 
    // Version Check 
    
    this.fetch_npmVersion("homebridge-homematic",function(npmVersion){
      npmVersion = npmVersion.replace('\n','');
      that.log("NPM %s vs Local %s",npmVersion,that.getVersion());
      if (npmVersion > that.getVersion()) {
       that.log("There is a new Version available. Please update with sudo npm -g update homebridge-homematic");
      }
    });
}

HomeMaticPlatform.prototype.setValue = function(channel, datapoint, value) {
    
    if (channel.indexOf("BidCos-RF.") > -1)  {
      this.xmlrpc.setValue(channel, datapoint, value);
      return;
    }

    if (channel.indexOf("VirtualDevices.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
      return;
    }


    if (channel.indexOf("CUxD.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
      return;
    }

    if (channel.indexOf("BidCos-Wired.") > -1) {
     
     if (this.xmlrpcwired!=undefined) {
      this.xmlrpcwired.setValue(channel, datapoint, value);
     } else {
      // Send over Rega
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
     }
      return;
    }
    
    
    if (channel.indexOf("HmIP-RF.") > -1) {
     
     if (this.xmlrpchmip!=undefined) {
      this.xmlrpchmip.setValue(channel, datapoint, value);
     } else {
      // Send over Rega
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
     }
      return;
    }


}

HomeMaticPlatform.prototype.remoteSetValue = function(channel,datapoint,value) {
	 var that = this;
	 this.foundAccessories.map(function(accessory) {
          if ((accessory.adress == channel) || ((accessory.cadress != undefined) && (accessory.cadress == channel))) {
             accessory.event(datapoint, value);
    }
    });
    return;
}


HomeMaticPlatform.prototype.setRegaValue = function(channel, datapoint, value) {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
      return;
}


HomeMaticPlatform.prototype.sendRegaCommand = function(command,callback) {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      var that = this;
      rega.script(command, function(data) {
		if (callback!=undefined) {
		 callback(data);
		}
      });
	 return;
}

HomeMaticPlatform.prototype.getValue = function(channel, datapoint, callback) {

    if (channel != undefined) {

    if (channel.indexOf("BidCos-RF.") > -1)  {
      this.xmlrpc.getValue(channel, datapoint, callback);
      return;
    }


    if (channel.indexOf("VirtualDevices.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.getValue(channel, datapoint, callback);
      return;
    }

    if (channel.indexOf("CUxD.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.getValue(channel, datapoint, callback);
      return;
    }
    
    if (channel.indexOf("BidCos-Wired.") > -1) {
     if (this.xmlrpcwired!=undefined) {
       this.xmlrpcwired.getValue(channel, datapoint, callback);
     } else {
      // Send over Rega
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
       rega.getValue(channel, datapoint, callback);
     }
      return;
    }
    
    if (channel.indexOf("HmIP-RF.") > -1) {
     if (this.xmlrpchmip!=undefined) {
       this.xmlrpchmip.getValue(channel, datapoint, callback);
     } else {
      // Send over Rega
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
       rega.getValue(channel, datapoint, callback);
     }
      return;
    }
    

    
    
    // Variable fallback
    
    var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
    rega.getVariable(channel, callback);
    return;
    
   }
}

HomeMaticPlatform.prototype.prepareRequest = function(accessory, script) {
    var that = this;
    this.sendQueue.push(script);
    that.delayed(100);
}

HomeMaticPlatform.prototype.sendPreparedRequests = function() {
    var that = this;
    var script = "var d;";
    this.sendQueue.map(function(command) {
      script = script + command;
    });
    this.sendQueue = [];
    var regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, function(data) {});
}

HomeMaticPlatform.prototype.sendRequest = function(accessory, script, callback) {

    var regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, function(data) {
      if (data != undefined) {
        try {
          var json = JSON.parse(data);
          callback(json);
        } catch (err) {
          callback(undefined);
        }
        return;
      }
    });
}

HomeMaticPlatform.prototype.delayed = function(delay) {
    var timer = this.delayed[delay];
    if (timer) {
      this.log("removing old command");
      clearTimeout(timer);
    }

    var that = this;
    this.delayed[delay] = setTimeout(function() {
      clearTimeout(that.delayed[delay]);
      that.sendPreparedRequests();
    }, delay ? delay : 100);
    this.log("New Timer was set");
}

HomeMaticPlatform.prototype.deviceInfo = function(config,devicetype) {
  var cfg = undefined;
  if (config != undefined) {
  
   var di = config["deviceinfo"];
   di.map(function(device) {
      
      if (device["type"]==devicetype) {
        cfg = device;
      }
      
   });
  }
  
  return cfg;
}

HomeMaticPlatform.prototype.internalConfig = function() {
  
  try {
    var config_path = path.join(__dirname, './internalconfig.json');
    var config = JSON.parse(fs.readFileSync(config_path));
    return config;
  }
  
  catch (err) {
   throw err;
  }
  
  return undefined
}
  
  
  
HomeMaticPlatform.prototype.getVersion = function() {
  var pjPath = path.join(__dirname, './package.json');
  var pj = JSON.parse(fs.readFileSync(pjPath));
  return pj.version;
}  

HomeMaticPlatform.prototype.fetch_npmVersion = function(pck, callback) {
  var exec = require('child_process').exec;
  var cmd = 'npm view '+pck+' version';
  exec(cmd, function(error, stdout, stderr) {
    var npm_version = stdout;
    npm_version = npm_version.replace('\n','');
    callback(npm_version);
 });
}
