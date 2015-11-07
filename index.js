'use strict';

var request = require("request");
var HomeMaticRPC = require("./HomeMaticRPC.js").HomeMaticRPC;
var HomeMaticRegaRequest =  require("./HomeMaticRegaRequest.js").HomeMaticRegaRequest;
var HomeMaticGenericChannel =  require("./HomeMaticChannel.js").HomeMaticGenericChannel;
var inherits = require('util').inherits;

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


  homebridge.registerPlatform("homebridge-homematic", "HomeMatic", HomeMaticPlatform);
}

function HomeMaticPlatform(log, config) {
  
  this.log = log;
  this.ccuIP = config["ccu_ip"];
  
  this.filter_device = config["filter_device"];
  this.filter_channel = config["filter_channel"];
  
  this.outlets = config["outlets"];

  this.doors = config["doors"];

  this.programs = config["programs"];
  
  this.sendQueue = [];
  this.timer = 0;

  this.foundAccessories = [];
  this.adressesToQuery = [];

  var port = config["local_port"];
  if (port==undefined) {
   port = 9090;
  }

  this.xmlrpc = new HomeMaticRPC(this.log, this.ccuIP, port, this);
  this.xmlrpc.init();
  
}


HomeMaticPlatform.prototype.accessories = function(callback) {

    this.log("Fetching Homematic devices...");
    var that = this;
    that.foundAccessories = [];

    var script = "string sDeviceId;string sChannelId;boolean df = true;Write(\'{\"devices\":[\');foreach(sDeviceId, root.Devices().EnumIDs()){object oDevice = dom.GetObject(sDeviceId);if(oDevice){var oInterface = dom.GetObject(oDevice.Interface());if(df) {df = false;} else { Write(\',\');}Write(\'{\');Write(\'\"id\": \"\' # sDeviceId # \'\",\');Write(\'\"name\": \"\' # oDevice.Name() # \'\",\');Write(\'\"address\": \"\' # oDevice.Address() # \'\",\');Write(\'\"channels\": [\');boolean bcf = true;foreach(sChannelId, oDevice.Channels().EnumIDs()){object oChannel = dom.GetObject(sChannelId);if(bcf) {bcf = false;} else {Write(\',\');}Write(\'{\');Write(\'\"cId\": \' # sChannelId # \',\');Write(\'\"name\": \"\' # oChannel.Name() # \'\",\');if(oInterface){Write(\'\"address\": \"\' # oInterface.Name() #\'.'\ # oChannel.Address() # \'\",\');}Write(\'\"type\": \"\' # oChannel.HssType() # \'\"\');Write(\'}\');}Write(\']}\');}}Write(\']}\');";

    var regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, function(data) {
      var json = JSON.parse(data);
      if (json["devices"] !== undefined) {
        json["devices"].map(function(device) {
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

              if ((that.filter_channel !== undefined) && (that.filter_channel.indexOf(ch.address) > -1)) {
                isChannelFiltered = true;
              } else {
                isChannelFiltered = false;
              }
              // that.log('name', ch.name, ' -> address:', ch.address);
              if ((ch.address !== undefined) && (!isChannelFiltered)) {

               
                  // Switch found
                  // Check if marked as Outlet or Door
                  var special = undefined;
                  if ((that.outlets!=undefined) && (that.outlets.indexOf(ch.address) > -1)) {special = "OUTLET";}
                  if ((that.doors!=undefined) && (that.doors.indexOf(ch.address) > -1)) {special = "DOOR";}
                  
                  var accessory = new HomeMaticGenericChannel(that.log, that, ch.id, ch.name, ch.type, ch.address, special, Service, Characteristic);
                  if (accessory.isSupported()==true) {
                  	that.foundAccessories.push(accessory);
                  }

              } else {
                that.log(device.name + " has no address");
              }

            });
          } else {
            that.log(device.name + " has no channels or is filtered");
          }

        });

        if (that.programs!=undefined) {
          that.programs.map(function(program){
            var accessory = new HomeMaticGenericChannel(that.log, that, "1234" , program , "PROGRAM_LAUNCHER" , "1234", Service, Characteristic);
        	that.foundAccessories.push(accessory);
          });
        }
/*
                      				    accessory = new HomeMaticGenericChannel(that.log, that, "5678" , "DummyBLIND" , "BLIND" , "5678");
        				                that.foundAccessories.push(accessory);
                  			  
        				                */
        callback(that.foundAccessories);
                
      } else {
        callback(that.foundAccessories);
      }
    });
}

HomeMaticPlatform.prototype.setValue = function(channel, datapoint, value) {
    if (channel.indexOf("BidCos-RF.") > -1)  {
      this.xmlrpc.setValue(channel, datapoint, value);
      return;
    }

    if (channel.indexOf("VirtualDevices.") > -1)  {
      var rega = new RegaRequest(this.log, this.ccuIP);
      rega.setValue(channel, datapoint, value);
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

    if (channel.indexOf("BidCos-RF.") > -1)  {
      this.xmlrpc.getValue(channel, datapoint, callback);
      return;
    }

    if (channel.indexOf("VirtualDevices.") > -1)  {
      var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
      rega.getValue(channel, datapoint, callback);
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

