'use strict';

const fs = require('fs')
const path = require('path')
var moment = require('moment')

function HomeKitGenericService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic, deviceType) {

  this.name     = name;
  this.displayName = name;
  this.type     = type;
  this.deviceType = deviceType;
  this.adress   = adress;
  this.deviceAdress = undefined;
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
  this.cfg = cfg;
  this.isWorking = false;
  this.ignoreWorking = false; // ignores the working=true flag and sets the value every time an event happends
  this.myDataPointName;
  this.i_characteristic = {};
  this.intf = cfg["interface"];
  this.datapointvaluefactors = {};
  this.readOnly = false;
  this.lowBat = false;
  this.lowBatCharacteristic = undefined;
  this.accessoryName = this.name;
  this.tampered = false;
  this.tamperedCharacteristic = undefined;
  this.delayOnSet = 0;
  this.runsInTestMode = (typeof global.it === 'function');
  var that = this;

  if (that.adress.indexOf("CUxD.") > -1) {
    this.usecache = false;
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

  if (this.propagateServices != undefined) {
    this.propagateServices(platform, Service, Characteristic);
  }

  this.createDeviceService(Service, Characteristic);

}




HomeKitGenericService.prototype = {
  /**
   add FakeGato History object only if not in a testcase
   **/
  enableLoggingService:function(type) {
    if (this.runsInTestMode == true) {
      this.log.debug("Skip Loging Service for %s because of testmode",this.displayName);
    } else {
      var FakeGatoHistoryService = require('./fakegato-history.js')(this.platform.homebridge);
      this.log.debug("Adding Log Service for %s",this.displayName);
      this.loggingService = new FakeGatoHistoryService(type, this, {storage: 'fs', path: this.platform.localCache,disableTimer:true});
      this.services.push(this.loggingService);
    }
  },

  addLogEntry:function(data) {
    // check if loggin is enabled
    if ((this.loggingService != undefined) && (data != undefined)) {
      data.time =  moment().unix()
      this.loggingService.addEntry(data)
    }
  },

  getClazzConfigValue:function(key,defaultValue) {
    var result = defaultValue
    if (this.cfg!=undefined) {
      if (this.cfg[key]!=undefined) {
        result = this.cfg[key]
      }
    }
    return result
  },

  addLowBatCharacteristic:function(rootService,Characteristic) {
    var bat = rootService.getCharacteristic(Characteristic.StatusLowBattery);

    if (bat != undefined) {
      this.lowBatCharacteristic = bat
    } else {
      // not added by default -> create it
      this.log.debug("added LowBat to %s",this.name)
      rootService.addOptionalCharacteristic(Characteristic.StatusLowBattery);
      this.lowBatCharacteristic = rootService.getCharacteristic(Characteristic.StatusLowBattery)
    }

  },

  addTamperedCharacteristic:function(rootService,Characteristic) {
    var tampered = rootService.getCharacteristic(Characteristic.StatusTampered);

    if (tampered != undefined) {
      this.tamperedCharacteristic = tampered
    } else {
      // not added by default -> create it
      this.log.debug("added Tampered to %s",this.name)
      rootService.addOptionalCharacteristic(Characteristic.StatusTampered);
      this.tamperedCharacteristic = rootService.getCharacteristic(Characteristic.StatusTampered)
    }

  },

  setReadOnly:function(readOnly) {
    this.readOnly = readOnly
    if (readOnly==true) {
      this.log.debug("set %s to read only",this.name)
    }
  },


  addValueMapping: function(dp,value,mappedvalue) {
    if (this.datapointMappings[dp]==undefined) {
      this.datapointMappings[dp] = [];
    }
    this.datapointMappings[dp][value] = mappedvalue;
  } ,

  addValueFactor: function(dp,factor) {
    this.datapointvaluefactors[dp] = factor;
  } ,


  // Return current States
  query: function(dp,callback) {
    var that = this;
    if (this.usecache == false) {
      this.remoteGetValue(dp, function(value) {
        if (callback!=undefined){callback(value);}
      });
    } else


    if ((this.usecache == true ) && (this.state[dp] != undefined) && (this.state[dp]!=null)) {
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
        if (value==true) {return 1;}
        if (value=="true") {return 1;}
        return 0;
        break;
      }
    }

    return value;
  },


  remoteSetDatapointValue: function(addressdatapoint,value,callback) {
    let parts = addressdatapoint.split('.')
    if (parts.length != 3) {
      this.log.error('%s : Syntax error in device address',addressdatapoint)
      callback(undefined);
      return;
    }
    this.platform.setValue(parts[0],parts[1],parts[2], value);
  },

  remoteGetDataPointValue:function(addressdatapoint,callback) {
    var that = this;
    let parts = addressdatapoint.split('.')
    if (parts.length != 3) {
      this.log.error('%s : Syntax error in device address',addressdatapoint)
      callback(undefined);
      return;
    }
    that.platform.getValue(parts[0],parts[0] + "." + parts[1],parts[2],function(newValue) {
      if ((newValue != undefined) && (newValue != null)) {

      } else {
        //newValue = 0;
        newValue = that.convertValue(parts[2],0)
      }


      if (callback!=undefined) {
        callback(newValue);
      }

    });
  },


  remoteGetDeviceValue:function(address,dp,callback) {
    var that = this;
    var interf = this.intf;
    that.platform.getValue(interf,address,dp,function(newValue) {

      if ((newValue != undefined) && (newValue != null)) {

        that.eventupdate = true;
        //var ow = newValue;
        newValue = that.convertValue(dp,newValue);
        that.cache(dp,newValue);
        that.eventupdate = false;
      } else {
        //newValue = 0;
        newValue = that.convertValue(dp,0)
      }


      if (callback!=undefined) {
        callback(newValue);
      }

    });
  },

  remoteGetValue:function(dp,callback) {
    var that = this;
    var tp = this.transformDatapoint(dp);
    var interf = this.intf;
    //that.platform.getValue(that.adress,dp,function(newValue) {

    that.platform.getValue(interf,tp[0],tp[1],function(newValue) {
      if ((newValue != undefined) && (newValue != null)) {

        if (tp[1] == 'LEVEL') {
          newValue = newValue * 100;
        }

        if ((tp[1] == 'COLOR') && (that.type == "RGBW_COLOR")) {
          newValue = Math.round((newValue/199)*360);
        }

        if (tp[1] == 'BRIGHTNESS') {
          newValue = Math.pow(10,(newValue/51));
        }

        that.eventupdate = true;
        //var ow = newValue;
        newValue = that.convertValue(dp,newValue);
        that.cache(dp,newValue);
        that.eventupdate = false;
      } else {
        //newValue = 0;
        newValue = that.convertValue(dp,0)
      }



      if (callback!=undefined) {
        callback(newValue);
      }

    });
  },

  isDatapointAddressValid:function(datapointAddress,acceptNull) {
    this.log.debug('validate datapoint %s we %s accept nul',datapointAddress,acceptNull ? 'do':'do not')
    if (datapointAddress!=undefined) {

      let parts = datapointAddress.split('.')
      // check we have 3 parts interface.address.name
      if (parts.length!=3) {
        this.log.error('%s is invalid not 3 parts',datapointAddress)
        return false
      }
      // check the address has a :
      if (parts[1].indexOf(':')==-1) {
        this.log.error('%s is invalid %s does not contain a :',datapointAddress,parts[1])
        return false
      }
      return true
    } else {
      // dp is undefined .. check if this is valid
      if (acceptNull == false) {
        this.log.error('null is not a valid datapoint')
      }
      return acceptNull
    }
  },

  endWorking:function() {

  },


  datapointEvent:function(dp,newValue) {
    // just a stub
  },

  event:function(channel,dp,newValue) {
    var that = this;

    if ((channel!=undefined) && (dp!=undefined)) {

      var tp = this.transformDatapoint(dp);


      if (tp[1] == 'LOWBAT') {
        that.lowBat = newValue
        if (that.lowBatCharacteristic != undefined) {
          that.lowBatCharacteristic.setValue(newValue)
        }
      }


      if (tp[1] == 'ERROR_SABOTAGE') {
        that.tampered = (newValue === 1)
        if (that.tamperedCharacteristic != undefined) {
          that.tamperedCharacteristic.setValue(newValue)
        }
      }

      if (tp[1] == 'ERROR') {
        that.tampered = (newValue === 7)
        if (that.tamperedCharacteristic != undefined) {
          that.tamperedCharacteristic.setValue(newValue)
        }
      }


      if (tp[1] == 'LEVEL') {
        newValue = newValue * 100;
      }
      if ((tp[1] == 'COLOR') && (this.type == "RGBW_COLOR")) {
        newValue = Math.round((newValue/199)*360);
      }
      if (tp[1] == 'BRIGHTNESS') {
        newValue = Math.pow(10,(newValue/51));
      }

      if (tp[1] == 'PRESS_SHORT') {
        var targetChar = that.currentStateCharacteristic[tp[1]];
        if (targetChar != undefined) {
          targetChar.setValue(1);
          setTimeout(function(){targetChar.setValue(0);}, 1000);
        }
        var chnl = channel.slice(channel.indexOf(":")+1);
        this.datapointEvent(chnl + ":" + dp,newValue);
        return;
      }

      var factor = this.datapointvaluefactors[tp[1]];

      if (factor != undefined) {
        newValue = newValue * factor;
      }

      if (dp=="WORKING") {
        if ((that.isWorking == true) && (newValue==false)) {
          that.endWorking();
        }
        that.isWorking = newValue;
      }
      this.eventupdate = true;
      if ((this.cadress!=undefined) || (this.deviceAdress!=undefined)){
        // this is dirty shit. ok there is a config that will set the cadress to a defined channel
        // if there is an rpc event at this channel the event will be forward here.
        // now fetch the real adress of that channel and get the channelnumber
        // datapoints from such channels named  as channelnumber:datapoint ... (no better approach yet)

        var chnl = channel.slice(channel.indexOf(":")+1);
        this.datapointEvent(chnl + ":" + dp,newValue);
        this.cache(chnl + ":" + dp,newValue);
      } else {
        this.datapointEvent(dp,newValue);
        this.cache(dp,newValue);
      }
      this.eventupdate = false;
    } else {
      this.log.warn("channel %s or dp %s is undefined",channel,dp);
    }
  },

  mappedValue:function(dp,value) {
    var result = value;
    var map = this.datapointMappings[dp];
    if (map != undefined) {
      if (map[value]!=undefined) {
        result = map[value];
      }
    }
    return result;
  },

  stateCharacteristicWillChange: function(characteristic,newValue) {
    // just a stub
  },

  stateCharacteristicDidChange: function(characteristic,newValue) {
    // just a stub
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
    if ((value!=undefined) && ((that.isWorking==false) || (that.ignoreWorking==true))) {
      if (that.currentStateCharacteristic[dp]!=undefined) {
        that.stateCharacteristicWillChange(that.currentStateCharacteristic[dp],value);
        that.currentStateCharacteristic[dp].setValue(value, null);
        that.stateCharacteristicDidChange(that.currentStateCharacteristic[dp],value);
      }
      if (this.usecache) {
        this.state[dp] = value;
      }
    } else {
      that.log.debug("Skip update because of working flag (%s) or IsNull(%s)",that.isWorking,value);
    }
  },

  delayed: function(mode, dp,value,delay) {
    let that = this;
    if (this.eventupdate==true) {
      return;
    }
    if (delay>0) {
      if ( this.timer[dp]!=undefined ) {
        clearTimeout(this.timer[dp]);
        this.timer[dp] = undefined;
      }
      this.timer[dp] = setTimeout( function(){
        clearTimeout(that.timer[dp]);
        that.timer[dp] = undefined;
        that.command(mode,dp,value)
      }, delay?delay:100 );
    } else {
      that.command(mode,dp,value)
    }
  },

  remoteSetDeviceValue: function(address,dp,value,callback) {
    this.log.debug("(Rpc) Send " + value + " to Datapoint " + dp + " at " + address);
    this.platform.setValue(undefined,address, dp, value);
  },

  command: function(mode,dp,value,callback) {
    var newValue = value;
    var tp = this.transformDatapoint(dp);

    if ((tp[1] == 'LEVEL') || (tp[1] == 'LEVEL_2')) {
      newValue = parseFloat(newValue) / 100;
      newValue = {"explicitDouble":newValue};
    }
    if ((tp[1] == 'COLOR') && (this.type == "RGBW_COLOR")) {
      newValue = Math.round((value / 360) * 199);
    }

    if (this.eventupdate==true) {
      return;
    }
    var that = this;

    if (mode == "set") {
      var interf = this.intf;
      that.log.debug("(Rpc) Send %s to %s at %s type %s" ,newValue, tp[1] , tp[0],typeof newValue);
      that.platform.setValue(interf,tp[0], tp[1], newValue);
      if (callback != undefined) {callback()}
    }

    if (mode == "setrega") {
      that.log.debug("(Rega) Send %s to %s at %s type %s",newValue, tp[1] , tp[0],typeof newValue);
      that.platform.setRegaValue(tp[0], tp[1], newValue);
      if (callback != undefined) {callback()}
    }

    if (mode == "sendregacommand") {
      that.platform.sendRegaCommand(newValue,callback);
    }

  },


  transformDatapoint : function(dp) {
    if (dp) {
      var pos = dp.indexOf(":");
      if (pos==-1) {
        return [this.adress,dp];
      }
      var ndp = dp.substr(pos+1,dp.length);
      var nadr = this.adress.substr(0,this.adress.indexOf(":"));
      var chnl = dp.substr(0,pos);
      nadr = nadr + ":" + chnl;
      return [nadr,ndp];
    } else {
      return -1;
    }
  },

  getServices: function() {
    return this.services;
  },

  shutdown: function() {

  },

  get_Service:function(name) {
    for (var index in this.services) {
      var service = this.services[index];

      if (typeof name === 'string' && (service.displayName === name || service.name === name || service.subtype === name))
      return service;
      else if (typeof name === 'function' && ((service instanceof name) || (name.UUID === service.UUID)))
      return service;
    }
  }
};

module.exports = {
  HomeKitGenericService : HomeKitGenericService
}
