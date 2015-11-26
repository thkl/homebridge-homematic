'use strict';

var request = require("request");
var HomeMaticRPC = require("./HomeMaticRPC.js").HomeMaticRPC;
var HomeMaticRegaRequest =  require("./HomeMaticRegaRequest.js").HomeMaticRegaRequest;
var HomeMaticGenericChannel =  require("./HomeMaticChannel.js").HomeMaticGenericChannel;
var inherits = require('util').inherits;
var path = require('path');
var fs = require('fs');

var Service, Characteristic;

module.exports = function(homebridge) {
 
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  
  // Register some required Services
  Service.DoorStateService = function(displayName, subtype) {
  	
  	Service.call(this, displayName, '5243F2EA-006C-4D68-83A0-4AF6F606136C', subtype);
    
    this.addCharacteristic(Characteristic.CurrentDoorState);
    this.addOptionalCharacteristic(Characteristic.Name);
  
  };

  inherits(Service.DoorStateService, Service);

  Characteristic.ProgramLaunchCharacteristic = function() {
    Characteristic.call(this, 'Program', "5E0115D7-7594-4846-AFB7-F456389E81EC");
    this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
            });
    this.value = this.getDefaultValue();
  };
  inherits(Characteristic.ProgramLaunchCharacteristic, Characteristic);


  Service.ProgramLaunchService = function(displayName, subtype) {
  	Service.call(this, displayName, 'B7F46B4D-3D69-4804-8114-393F257D4039', subtype);
    this.addCharacteristic(Characteristic.ProgramLaunchCharacteristic);
  };

  inherits(Service.ProgramLaunchService, Service);

  homebridge.registerPlatform("homebridge-homematic", "HomeMatic", HomeMaticPlatform);
}

function HomeMaticPlatform(log, config) {
  
  this.log = log;
  
  this.log("Homematic Plugin Version " + this.getVersion());
  this.log("Please report any issues to https://github.com/thkl/homebridge-homematic/issues");
  
  this.ccuIP = config["ccu_ip"];
  
  this.filter_device = config["filter_device"];
  this.filter_channel = config["filter_channel"];
  
  this.outlets = config["outlets"];

  this.doors = config["doors"];
  this.variables = config["variables"];
  this.programs = config["programs"];
  this.subsection = config["subsection"];
  this.sendQueue = [];
  this.timer = 0;

  this.foundAccessories = [];
  this.adressesToQuery = [];

  var port = config["local_port"];
  if (port==undefined) {
   port = 9090;
  }

  this.xmlrpc = new HomeMaticRPC(this.log, this.ccuIP, port, 0, this);
  this.xmlrpc.init();
  
  if (config["enable_wired"]!=undefined) {
	  this.xmlrpcwired = new HomeMaticRPC(this.log, this.ccuIP, port+1, 1, this);
  	  this.xmlrpcwired.init();
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
      setTimeout(process.exit(0), 2000);
  });
}


HomeMaticPlatform.prototype.accessories = function(callback) {

    this.log("Fetching Homematic devices...");
    var that = this;
    that.foundAccessories = [];
    var internalconfig = this.internalConfig();
    
    var script = "string sDeviceId;string sChannelId;boolean df = true;Write(\'{\"devices\":[\');foreach(sDeviceId, root.Devices().EnumIDs()){object oDevice = dom.GetObject(sDeviceId);if(oDevice){var oInterface = dom.GetObject(oDevice.Interface());if(df) {df = false;} else { Write(\',\');}Write(\'{\');Write(\'\"id\": \"\' # sDeviceId # \'\",\');Write(\'\"name\": \"\' # oDevice.Name() # \'\",\');Write(\'\"address\": \"\' # oDevice.Address() # \'\",\');Write(\'\"type\": \"\' # oDevice.HssType() # \'\",\');Write(\'\"channels\": [\');boolean bcf = true;foreach(sChannelId, oDevice.Channels().EnumIDs()){object oChannel = dom.GetObject(sChannelId);if(bcf) {bcf = false;} else {Write(\',\');}Write(\'{\');Write(\'\"cId\": \' # sChannelId # \',\');Write(\'\"name\": \"\' # oChannel.Name() # \'\",\');if(oInterface){Write(\'\"address\": \"\' # oInterface.Name() #\'.'\ # oChannel.Address() # \'\",\');}Write(\'\"type\": \"\' # oChannel.HssType() # \'\"\');Write(\'}\');}Write(\']}\');}}Write(\']\');";

    
    if (this.subsection!=undefined) {
   
     script = script + "var s = dom.GetObject(\"" ;
     script = script + this.subsection;
     script = script + "\");string cid;boolean sdf = true;if (s) {Write(\',\"subsection\":[\');foreach(cid, s.EnumUsedIDs()){ ";
     script = script +" if(sdf) {sdf = false;}";
     script = script +" else { Write(\',\');}Write(cid);}Write(\']\');}";
    }
    
    
    script = script + "Write('\}'\);";
    
    var regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, function(data) {
    
      var json = JSON.parse(data);
      if (json["devices"] !== undefined) {
        json["devices"].map(function(device) {
        
          var cfg = that.deviceInfo(internalconfig,device["type"]);

          var isFiltered = false;

          if ((that.filter_device !== undefined) && (that.filter_device.indexOf(device.address) > -1)) {
            isFiltered = true;
          } else {
            isFiltered = false;
          }
          // that.log('device address:', device.address);

          if ((device["channels"] !== undefined) && (!isFiltered)) {

            device["channels"].map(function(ch) {
              
              
              var isChannelFiltered = false;
			  // if we have a subsection list check if the channel is here
			  if (json["subsection"]!=undefined) {
			   var cin = (json["subsection"].indexOf(ch.cId) > -1);
			    // if not .. set filter flag
			    isChannelFiltered = !cin;
			  }

			  if ((cfg!=undefined) && (cfg["filter"]!=undefined) && (cfg["filter"].indexOf(ch.type)>-1)) {
			  	isChannelFiltered = true;
			  }

              if ((that.filter_channel !== undefined) && (that.filter_channel.indexOf(ch.address) > -1)) {
                isChannelFiltered = true;
              } 
              
              
              // that.log('name', ch.name, ' -> address:', ch.address);
              if ((ch.address !== undefined) && (!isChannelFiltered)) {

               
                  // Switch found
                  // Check if marked as Outlet or Door
                  var special = undefined;
                  if ((that.outlets!=undefined) && (that.outlets.indexOf(ch.address) > -1)) {special = "OUTLET";}
                  if ((that.doors!=undefined) && (that.doors.indexOf(ch.address) > -1)) {special = "DOOR";}
                  
                  var accessory = new HomeMaticGenericChannel(that.log, that, ch.id, ch.name, ch.type, ch.address, special ,cfg, Service, Characteristic);
                  if (accessory.isSupported()==true) {
                  	that.foundAccessories.push(accessory);
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
            var accessory = new HomeMaticGenericChannel(that.log, that, "1234" , program , "PROGRAM_LAUNCHER" , "1234", "" , undefined, Service, Characteristic);
        	that.foundAccessories.push(accessory);
          });
        }

// Add Optional Variables
      if (that.variables!=undefined) {
          that.variables.map(function(variable) {
			var accessory = new HomeMaticGenericChannel(that.log, that, variable , variable, "VARIABLE" , variable,"", undefined ,Service, Characteristic);
    	    that.foundAccessories.push(accessory);
          });
      }

/*
		var accessory = new HomeMaticGenericChannel(that.log, that, "5678" , "DummyKMK" , "KEYMATIC" , "5678","", cfg, Service, Characteristic);
        if (accessory.isSupported()==true) {
           that.foundAccessories.push(accessory);
        }
*/                
                  			  
        callback(that.foundAccessories);
                
      } else {
        callback(that.foundAccessories);
      }
    });
    
    // Version Check 
    
    this.fetch_npmVersion("homebridge-homematic",function(npmVersion){
      npmVersion = npmVersion.replace('\n','');
      that.log("NPM %s vs Local %s",npmVersion,that.getVersion());
      if (npmVersion > that.getVersion()) {
       that.log("There is a new Version available. Please update with sudo npm -g update homebridge-homematic");
      }
    });
}

HomeMaticPlatform.prototype.setValue = function(channel, datapoint, value) {
    
    if (channel.indexOf("BidCos-RF.") > -1)  {
      this.xmlrpc.setValue(channel, datapoint, value);
      return;
    }

    if (channel.indexOf("VirtualDevices.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
      return;
    }


    if (channel.indexOf("CUxD.") > -1)  {
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
		 callback();
		}
      });
	 return;
}

HomeMaticPlatform.prototype.getValue = function(channel, datapoint, callback) {

    if (channel != undefined) {

    if (channel.indexOf("BidCos-RF.") > -1)  {
      this.xmlrpc.getValue(channel, datapoint, callback);
      return;
    }


    if (channel.indexOf("VirtualDevices.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.getValue(channel, datapoint, callback);
      return;
    }

    if (channel.indexOf("CUxD.") > -1)  {
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
      if (data !== undefined) {
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

