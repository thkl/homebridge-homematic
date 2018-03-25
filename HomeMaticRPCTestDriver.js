'use strict';

var isInTest = typeof global.it === 'function';

var HomeMaticRPCTestDriver = function (log, ccuip,port,system,platform) {
  this.log = log;
  this.system = system;
  this.ccuip = ccuip;
  this.platform = platform;
  this.interface = 'BidCos-RF.'
}

HomeMaticRPCTestDriver.prototype.init = function() {
  if (!isInTest) {
    this.log.warn('Rega Dummy Class for Tests only it looks like i am running in production mode.')
  }
}

HomeMaticRPCTestDriver.prototype.getIPAddress = function() {
  return "0.0.0.0";
}

HomeMaticRPCTestDriver.prototype.getValue = function(channel, datapoint, callback) {
  if (this.platform.homebridge != undefined) {
    this.log.debug('Client ask for %s.%s',channel,datapoint)
    callback(this.platform.homebridge.values[channel + '.' + datapoint]);
  } else {
    callback(0)
  }
}

HomeMaticRPCTestDriver.prototype.setValue = function(channel, datapoint, value) {
  this.log.debug("Set RPC Called %s.%s - %s",channel, datapoint, value)
  if (typeof value == 'object') {
    value = value['explicitDouble'];
  }
  this.platform.homebridge.values[channel + '.' + datapoint] = value;
}

HomeMaticRPCTestDriver.prototype.connect = function() {

}


HomeMaticRPCTestDriver.prototype.ccuWatchDog = function() {

}

HomeMaticRPCTestDriver.prototype.stop = function() {

}

HomeMaticRPCTestDriver.prototype.event = function(params,callback) {
  let that = this
  this.log.debug('rpc <- event on %s'  , this.interface );
  this.lastMessage = Math.floor((new Date()).getTime() / 1000);
  var channel = this.interface + params[1];
  var datapoint = params[2];
  var value = params[3];
  let address = this.interface + params[1] + '.' + params[2]

  if (typeof value == 'object') {
    value = value['explicitDouble'];
  }

  this.platform.homebridge.values[params[1] + '.' + params[2]] = value;

  this.log.debug("Ok here is the Event" + JSON.stringify(params));
  this.log.debug("RPC single event for %s.%s with value %s",channel,datapoint,value);

  this.platform.foundAccessories.map(function(accessory) {
    if ((accessory.adress == channel) || ((accessory.cadress != undefined) && (accessory.cadress == channel))) {
      that.log.debug("found accessory %s",accessory.adress );
      accessory.event(channel, datapoint, value);
    }
  });

  this.platform.eventAdresses.map(function(tuple){
    that.log.debug('check %s vs %s',address,tuple.address)
    if (address == tuple.address) {
      that.log.debug('found jump into')
      tuple.accessory.event(channel,datapoint, value)
    }
  })

  if (callback != undefined) {
    callback(null,[]);
  }
}

HomeMaticRPCTestDriver.prototype.multicall = function(events,callback) {
  this.log.debug('rpc <- system.multicall on %s'  , this.interface);
  let that = this
  params.map(function(events) {
    try {
      events.map(function(event) {
        if ((event["methodName"] == "event") && (event["params"] !== undefined)) {

          var params = event["params"];
          var channel = that.interface + params[1];
          var datapoint = params[2];
          var value = params[3];
          let address = that.interface + params[1] + '.' + params[2]

          that.log.debug("RPC event for %s %s with value %s",channel,datapoint,value);

          that.platform.foundAccessories.map(function(accessory) {
            var deviceAdress = channel.slice(0,channel.indexOf(":"));

            if ((accessory.adress == channel) || 
            ((accessory.cadress != undefined) && (accessory.cadress == channel)) || 
            ((accessory.deviceAdress != undefined) && (accessory.deviceAdress == deviceAdress))) {
              that.log.debug("Accessory %s found -> Send Event",accessory.name);
              accessory.event(channel,datapoint, value);
            }

          });

          that.platform.eventAdresses.map(function(tuple){
            if (address == tuple.address) {
              tuple.accessory.event(channel,datapoint, value)
            }
          })
        }
      });
    } catch (err) {}
  });

  if (callback != undefined) {
    callback(null,[]);
  }

}

HomeMaticRPCTestDriver.prototype.isPortTaken = function(port, fn) {
  return false;
}

module.exports = {
  HomeMaticRPCTestDriver : HomeMaticRPCTestDriver
}
