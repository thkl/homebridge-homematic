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
  this.interface = (system==0) ? "BidCos-RF." : "BidCos-Wired."
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
      that.log("Method " + method + " does not exist");
    });

    this.server.on("system.listMethods", function(err, params, callback) {
      that.log("Method call params for 'system.listMethods': " + params);
      callback(null, ["system.listMethods", "system.multicall"]);
    });


    this.server.on("system.multicall", function(err, params, callback) {
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
                if (accessory.adress == channel) {
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

	debug("RPC setValue Call for %s %s Value %s",channel,datapoint,value);
	this.client.methodCall("setValue", [channel, datapoint, value], function(error, value) {
	 debug("RPC setValue (%s %s) Response %s Errors: %s",channel, datapoint, JSON.stringify(value),error);
    });
  }

  HomeMaticRPC.prototype.connect = function() {
    var that = this;
    var port = (this.system == 0) ?  2001 : 2000;
    this.log("Creating Local HTTP Client for CCU RPC Events");
    this.client = binrpc.createClient({
      host: this.ccuip,
      port: port,
      path: "/"
    });
    this.log("CCU RPC Init Call on port " +  port + " for interface " + this.interface);
    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort, "homebridge"], function(error, value) {
      debug("CCU Response ...%s %s",JSON.stringify(value) , error);
    });
  },


HomeMaticRPC.prototype.stop = function() {
    this.log("Removing Event Server for Interface " +this.interface);
    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort], function(error, value) {

    });
}

module.exports = { 
  HomeMaticRPC : HomeMaticRPC 
}


