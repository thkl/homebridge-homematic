'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitSecuritySystem(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitSecuritySystem.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitSecuritySystem, HomeKitGenericService);


HomeMaticHomeKitSecuritySystem.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
  // Register new Characteristic or Services here
  
}



HomeMaticHomeKitSecuritySystem.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    // Fill Servicelogic here
    var secsys = new Service["SecuritySystem"](this.name);
    this.services.push(secsys);
    this.ignoreWorking = true;
    	
    // Characteristic.SecuritySystemCurrentState and Characteristic.SecuritySystemTargetState 
    
    var cs = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)

    .on('get', function(callback) {
      that.query("4:ARMSTATE",function(value){
	    var hkValue = that.mappedValue("4:ARMSTATE",value);
	    if (callback) callback(null,hkValue);
      });
    }.bind(this));

	that.currentStateCharacteristic["4:ARMSTATE"] = cs;
    cs.eventEnabled = true;


	var ts = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)

    .on('set', function(value,callback) {
       
       var hmvalue = -1;
       if (value==Characteristic.SecuritySystemTargetState.DISARM) {hmvalue = 0;}
       if (value==Characteristic.SecuritySystemTargetState.NIGHT_ARM) {hmvalue = 1;}
       if (value==Characteristic.SecuritySystemTargetState.AWAY_ARM) {hmvalue = 2;}
       if (value==Characteristic.SecuritySystemTargetState.STAY_ARM) {hmvalue = 3;}
    
       if (hmvalue != -1) {
	       that.command("set","4:ARMSTATE" , hmvalue)
	       setTimeout(function () {
		       that.remoteGetValue("4:ARMSTATE",function(value) {
			        if (value==0){ts.updateValue(Characteristic.SecuritySystemTargetState.DISARM,null);}
			        if (value==1){ts.updateValue(Characteristic.SecuritySystemTargetState.NIGHT_ARM,null);}
			        if (value==2){ts.updateValue(Characteristic.SecuritySystemTargetState.AWAY_ARM,null);}
			        if (value==3){ts.updateValue(Characteristic.SecuritySystemTargetState.STAY_ARM,null);}
		       });
	       }, 1000);
       }
       if (callback) callback();
    }.bind(this));

	this.remoteGetValue("4:ARMSTATE");

	this.addValueMapping("4:ARMSTATE",0,Characteristic.SecuritySystemTargetState.DISARM);
    this.addValueMapping("4:ARMSTATE",1,Characteristic.SecuritySystemTargetState.NIGHT_ARM);
    this.addValueMapping("4:ARMSTATE",2,Characteristic.SecuritySystemTargetState.AWAY_ARM);
    this.addValueMapping("4:ARMSTATE",3,Characteristic.SecuritySystemTargetState.STAY_ARM);


    var horn = secsys.getCharacteristic(Characteristic.SecuritySystemAlarmType)

    .on('get', function(callback) {
      that.query("1:STATE",function(value){
        if (callback) callback(null,value);
      });
    }.bind(this));

	that.currentStateCharacteristic["1:STATE"] = horn;
    horn.eventEnabled = true;


	this.deviceAdress = this.adress.slice(0, this.adress.indexOf(":"));
}

HomeMaticHomeKitSecuritySystem.prototype.endWorking=function()  {
   this.remoteGetValue("4:ARMSTATE");
}

module.exports = HomeMaticHomeKitSecuritySystem; 