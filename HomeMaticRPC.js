'use strict';

var binrpc = require("homematic-xmlrpc");
var request = require("request");
var debug = require('debug')('HomeMaticRPC');

var HomeMaticRPC = function (log, ccuip,port,system,platform) {
  
  this.log = log;
  
  this.log("init RPC");
  this.system = system;
  this.ccuip = ccuip;
  this.platform = platform;
  this.server;
  this.client;
  this.stopping = false;
  this.localIP;
  this.listeningPort = port;
  this.lastMessage = 0;
  this.watchDogTimer;
  
  
  switch (system) {
  
    case 0 : 
    this.interface = "BidCos-RF.";
	this.ccuport = 2001;
    break;
    
    case 1 : 
    this.interface = "BidCos-Wired.";
  	this.ccuport = 2000;
	break;


    case 2 : 
    this.interface = "HmIP-RF.";
    this.ccuport = 2010;
	break;

  }
  
  
}

HomeMaticRPC.prototype.init = function() {
    var that = this;

    var ip = this.getIPAddress();
    if (ip == "0.0.0.0") {
      that.log("Can not fetch IP");
      return;
    }

    this.localIP = ip;
    this.log("Local IP: " + this.localIP);

    this.server = binrpc.createServer({
      host: this.localIP,
      port: this.listeningPort
    });

    this.server.on("NotFound", function(method, params) {
      debug("Method " + method + " does not exist. - " + JSON.stringify(params));
    });

    this.server.on("system.listMethods", function(err, params, callback) {
      debug("Method call params for 'system.listMethods': " +  JSON.stringify(params));
      callback(null, ["event","system.listMethods", "system.multicall"]);
    });
    
    this.server.on("listDevices", function(err, params, callback) {
      debug('rpc <- listDevices on '  + that.interface + ' - Zero Reply');
      callback(null,[]);
    });


	this.server.on("newDevices", function(err, params, callback) {
      debug('rpc <- newDevices on '  + that.interface + ' nobody is interested in newdevices ... ');
      // we are not intrested in new devices cause we will fetch them at launch
      callback(null,[]);
    });


	this.server.on("event", function(err, params, callback) {
 	  debug('rpc <- event  on '  + this.interface );
 	  that.lastMessage = Math.floor((new Date()).getTime() / 1000);
      var channel = that.interface + params[1];
      var datapoint = params[2];
      var value = params[3];
      debug("Ok here is the Event" + JSON.stringify(params));
      debug("RPC single event for %s %s with value %s",channel,datapoint,value);
			 
      that.platform.foundAccessories.map(function(accessory) {
       if ((accessory.adress == channel) || ((accessory.cadress != undefined) && (accessory.cadress == channel))) {
         accessory.event(datapoint, value);
       }
      });
      callback(null,[]);
	});
    
    this.server.on("system.multicall", function(err, params, callback) {
 	  debug('rpc <- system.multicall on '  + that.interface);
      that.lastMessage = Math.floor((new Date()).getTime() / 1000);
      
      params.map(function(events) {
        try {
          events.map(function(event) {
            if ((event["methodName"] == "event") && (event["params"] !== undefined)) {
              
              var params = event["params"];
              var channel = that.interface + params[1];
              var datapoint = params[2];
              var value = params[3];
          	  debug("RPC event for %s %s with value %s",channel,datapoint,value);
			 
              that.platform.foundAccessories.map(function(accessory) {
                if ((accessory.adress == channel) || ((accessory.cadress != undefined) && (accessory.cadress == channel))) {
                  accessory.event(datapoint, value);
                }
                
                                
              });
            }
          });
        } catch (err) {}
      });
      callback(null);
    });

    this.log("XML-RPC server for interface " + this.interface + "is listening on port " + this.listeningPort);
    this.connect();

  }

  HomeMaticRPC.prototype.getIPAddress = function() {
    var interfaces = require("os").networkInterfaces();
    for (var devName in interfaces) {
      var iface = interfaces[devName];
      for (var i = 0; i < iface.length; i++) {
        var alias = iface[i];
        if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal)
          return alias.address;
      }
    }
    return "0.0.0.0";
  }

  HomeMaticRPC.prototype.getValue = function(channel, datapoint, callback) {

    var that = this;
    if (this.client === undefined) {
      that.log("Returning cause client is invalid");
      return;
    }
    if (channel.indexOf(that.interface) > -1)  {
      channel = channel.substr(that.interface.length);

	  debug("RPC getValue Call for %s %s",channel,datapoint);
	  this.client.methodCall("getValue", [channel, datapoint], function(error, value) {
    	debug("RPC getValue (%s %s) Response %s Errors: %s",channel,datapoint, JSON.stringify(value),error);
        callback(value);
      });
      return;
    }
  }

  HomeMaticRPC.prototype.setValue = function(channel, datapoint, value) {

    var that = this;

    if (this.client === undefined) return;
    if (channel.indexOf(that.interface) > -1)  {
      channel = channel.substr(that.interface.length);
    }

    if (that.interface != "HmIP-RF.") {
      value = String(value);
    }

	debug("RPC setValue Call for %s %s Value %s Type %s",channel,datapoint,value, typeof value);
	
	
	
	this.client.methodCall("setValue", [channel, datapoint, value], function(error, value) {
	 debug("RPC setValue (%s %s) Response %s Errors: %s",channel, datapoint, JSON.stringify(value),error);
    });
  }

  HomeMaticRPC.prototype.connect = function() {
    var that = this;
    this.lastMessage = Math.floor((new Date()).getTime() / 1000);
    var port = this.ccuport;
    this.log("Creating Local HTTP Client for CCU RPC Events");
    this.client = binrpc.createClient({
      host: this.ccuip,
      port: port,
      path: "/"
    });
    this.log("CCU RPC Init Call on port " +  port + " for interface " + this.interface);
    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort, "homebridge_" + this.interface], function(error, value) {
      debug("CCU Response ...Value (%s) Error : (%s)",JSON.stringify(value) , error);
      that.lastMessage = Math.floor((new Date()).getTime() / 1000);
    });
    
    this.ccuWatchDog();
  }


  HomeMaticRPC.prototype.ccuWatchDog = function() {
    var that = this;
	
	if (this.lastMessage != undefined) {
	    var now = Math.floor((new Date()).getTime() / 1000);
    	var timeDiff = now - this.lastMessage;
    	if (timeDiff > 600) {
     		that.log("Watchdog Trigger - Reinit Connection for " + this.interface + " after idle time of " + timeDiff + " seconds");
		    this.lastMessage = now;
		    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort, "homebridge_" + this.interface], function(error, value) {
      			debug("CCU Response ...Value (%s) Error : (%s)",JSON.stringify(value) , error);
      			that.lastMessage = Math.floor((new Date()).getTime() / 1000);
   			 });
    	}
    }
	
	var recall = function() {
	 that.ccuWatchDog();
	}

    this.watchDogTimer = setTimeout(recall, 10000);
  }

  HomeMaticRPC.prototype.stop = function() {
    this.log("Removing Event Server for Interface " +this.interface);
    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort], function(error, value) {

    });
   }

module.exports = { 
  HomeMaticRPC : HomeMaticRPC 
}


