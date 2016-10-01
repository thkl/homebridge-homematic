'use strict';
var path = require('path');
var fs = require('fs');
var HomeKitGenericService = require('./ChannelServices/HomeKitGenericService.js').HomeKitGenericService;

var HomeMaticChannelLoader = function (log) {
	this.log = log;
}
  
  HomeMaticChannelLoader.prototype.init = function() {
  	  var that = this;
	  this.config = this.internalConfig();
  }
  
  HomeMaticChannelLoader.prototype.loadChannelService = function(list,deviceType,channelType,log,platform, id ,name ,adress,special, cfg, Service, Characteristic) {

    var that = this;

    // try to load device:type
    var serviceclass;
    serviceclass = this.getServiceClass(deviceType+":"+channelType);
    if (serviceclass == undefined) {
      // not found try to find channeltype
      serviceclass = this.getServiceClass(channelType);
    }
  
  
    if (serviceclass != undefined) {
      var service = require ('./ChannelServices/' + serviceclass)
	  var accessory = new service(log,platform, id ,name, channelType ,adress,special, cfg, Service, Characteristic);
	  list.push(accessory);	
    } else {
      that.log("There is no service for " + deviceType+":"+channelType );
   	}
  };
  
  
  HomeMaticChannelLoader.prototype.getServiceClass = function(type) {
   var that = this;
   var serviceclass = undefined;
   
   if (this.config != undefined) {
  		var ci = this.config["channelconfig"];
   			ci.map(function(service) {
   			  	if (service["type"]==type) {
   			  	  serviceclass = service["service"];
				}
			});
   }
   return serviceclass;
  }
  
  
  HomeMaticChannelLoader.prototype.internalConfig = function() {
  
  try {
    var config_path = path.join(__dirname, './ChannelServices/channel_config.json');
    var config = JSON.parse(fs.readFileSync(config_path));
    return config;
  }
  
  catch (err) {
   this.log("Internal Channel config has errors, or was found");
   throw err;
  }
  
  return undefined;
  };


module.exports = {
  HomeMaticChannelLoader : HomeMaticChannelLoader
}