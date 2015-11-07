'use strict';

var xmlrpc = require("homematic-xmlrpc");
var request = require("request");

var HomeMaticRPC = function (log, ccuip,port ,platform) {
  
  this.log = log;
  
  this.log("init RPC");
  
  this.ccuip = ccuip;
  this.platform = platform;
  this.server;
  this.client;
  this.stopping = false;
  this.localIP;
  this.listeningPort = port;
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

    this.server = xmlrpc.createServer({
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
              var channel = "BidCos-RF." + params[1];
              var datapoint = params[2];
              var value = params[3];
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

    this.log("XML-RPC server listening on port " + this.listeningPort);
    this.connect();


    process.on("SIGINT", function() {
      if (that.stopping) {
        return;
      }
      that.stopping = true;
      that.stop();
    });

    process.on("SIGTERM", function() {
      if (that.stopping) {
        return;
      }
      that.stopping = true;
      that.stop();
    });

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
    if (channel.indexOf("BidCos-RF.") > -1)  {
      channel = channel.substr(10);
      this.client.methodCall("getValue", [channel, datapoint], function(error, value) {
        callback(value);
      });
      return;
    }
  }

  HomeMaticRPC.prototype.setValue = function(channel, datapoint, value) {

    var that = this;

    if (this.client === undefined) return;

    if (channel.indexOf("BidCos-RF.") > -1)  {
      channel = channel.substr(10);
    }

    this.client.methodCall("setValue", [channel, datapoint, value], function(error, value) {

    });
  }

  HomeMaticRPC.prototype.connect = function() {
    var that = this;
    this.log("Creating Local HTTP Client for CCU RPC Events");
    this.client = xmlrpc.createClient({
      host: this.ccuip,
      port: 2001,
      path: "/"
    });
    this.log("CCU RPC Init Call on port 2001");
    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort, "homebridge"], function(error, value) {
      that.log("CCU Response ....");
    });
  },


HomeMaticRPC.prototype.stop = function() {
    this.log("Removing Event Server");
    this.client.methodCall("init", ["http://" + this.localIP + ":" + this.listeningPort], function(error, value) {

    });
    setTimeout(process.exit(0), 1000);
}

module.exports = { 
  HomeMaticRPC : HomeMaticRPC 
}



