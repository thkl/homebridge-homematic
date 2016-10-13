'use strict';
var path = require('path');
var fs = require('fs');
var HomeKitGenericService = require('./ChannelServices/HomeKitGenericService.js').HomeKitGenericService;

var HomeMaticChannelLoader = function (log) {
	this.log = log;
}
  
  HomeMaticChannelLoader.prototype.init = function(customServices) {
  	  var that = this;
	  this.config = this.internalConfig(customServices);
  }
  
  HomeMaticChannelLoader.prototype.loadChannelService = function(list,deviceType,channelType,log,platform, id ,name ,adress,special, cfg, Service, Characteristic) {

    var that = this;

    // try to load device:type
    var serviceclass;
    var options;
    
    serviceclass = this.getServiceClass(deviceType+":"+channelType);
    options = this.getOptions(deviceType+":"+channelType);
    
    if (serviceclass == undefined) {
      // not found try to find channeltype
      serviceclass = this.getServiceClass(channelType);
      options = this.getOptions(channelType);
    }
  
  
    if (serviceclass != undefined) {
      var service = require ('./ChannelServices/' + serviceclass);
      // add Options 
      if (options != undefined) {
        if (cfg != undefined) {
            cfg.push.apply(cfg, options);
        } else {
          	cfg = options;
        }
      }
	  var accessory = new service(log,platform, id ,name, channelType ,adress,special, cfg, Service, Characteristic);
	  list.push(accessory);	
    } else {
      that.log.warn("There is no service for " + deviceType+":"+channelType );
   	}
  };
  

  HomeMaticChannelLoader.prototype.getOptions = function(type) {
   var that = this;
   var options = undefined;
   
   if (this.config != undefined) {
  		var ci = this.config["channelconfig"];
   			ci.map(function(service) {
   			  	if (service["type"]==type) {
   			  	  options = service["options"];
				}
			});
   }
   return options;
  }

  
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
  
  
  HomeMaticChannelLoader.prototype.internalConfig = function(customServices) {
  
  try {
    var config_path = path.join(__dirname, './ChannelServices/channel_config.json');
    var config = JSON.parse(fs.readFileSync(config_path));
    if (customServices != undefined) {
      customServices.map(function(service) {
     	 config["channelconfig"].push(service);
      });
    }
    
    
    return config;
  }
  
  catch (err) {
   this.log.warn("Internal Channel config has errors, or was not found. You may ceck the file ChannelService/channel_config.json");
   throw err;
  }
  
  return undefined;
  };


module.exports = {
  HomeMaticChannelLoader : HomeMaticChannelLoader
}