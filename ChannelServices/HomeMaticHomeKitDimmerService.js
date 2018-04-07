'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");
var curLevel=0;
var lastLevel=0;
var onc;

function HomeMaticHomeKitDimmerService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitDimmerService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitDimmerService, HomeKitGenericService);


HomeMaticHomeKitDimmerService.prototype.createDeviceService = function(Service, Characteristic) {
  var that = this;
  var lightbulb = new Service.Lightbulb(this.name);
  this.delayOnSet = 5;
  this.services.push(lightbulb);
  this.ignoreWorking = true

  this.onc = lightbulb.getCharacteristic(Characteristic.On)

  .on('get', function(callback) {
    that.query("LEVEL",function(value) {
      if (value==undefined) {
        value = 0;
      }
      that.state["LAST"] = value;
      if (callback) callback(null,value>0);
    });
  }.bind(this))

  .on('set', function(value, callback) {
    var lastLevel = that.state["LAST"];
    if (lastLevel == undefined) {
      lastLevel = -1;
    }
    if (((value==true) || ((value==1))) && ((lastLevel<1))) {
      that.state["LAST"]=100;
      that.command("set","LEVEL" , 100);
    } else
    if ((value==0) || (value==false)) {
      that.state["LAST"]=0;
      that.command("set","LEVEL" , 0);
    } else
    if (((value==true) || ((value==1))) && ((lastLevel>0))) {

    }

    else {
      that.delayed("set","LEVEL" , lastLevel,2);
    }
    callback();
  }.bind(this));

  this.onc.eventEnabled = true;

  this.brightness = lightbulb.getCharacteristic(Characteristic.Brightness)
  .on('get', function(callback) {
    that.query("LEVEL",function(value){
      that.state["LAST"] = (value);
      that.log.info("Get Level %s",value)
      if (callback) callback(null,value);
    });
  }.bind(this))

  .on('set', function(value, callback) {
    var lastLevel = that.state["LAST"];
    if (value!=lastLevel) {
      if (value==0){
        // set On State
        if ((that.onc!=undefined) && (that.onc.updateValue!=undefined)) {that.onc.updateValue(false,null);}
      } else {
        if ((that.onc!=undefined) && (that.onc.updateValue!=undefined)) {that.onc.updateValue(true,null);}
      }
      that.log.debug("Set Brightness of " + that.adress + " to " + value + " command. LastLevel is "+  lastLevel);
      that.state["LAST"] = value;
      that.isWorking = true;
      that.delayed("set","LEVEL" , value,that.delayOnSet);
    }
    if (callback)  callback();
  }.bind(this));

  this.brightness.eventEnabled = true;

  this.platform.registerAdressForEventProcessingAtAccessory(this.adress + ".LEVEL",this,function(newValue){
    this.processDimmerLevel(newValue)
  })


  this.remoteGetValue('LEVEL',function(newValue){
    that.processDimmerLevel(newValue)
  })

}

HomeMaticHomeKitDimmerService.prototype.processDimmerLevel = function(newValue){
  this.brightness.updateValue(newValue,null)
  this.onc.updateValue((newValue>0),null)
}


module.exports = HomeMaticHomeKitDimmerService;
