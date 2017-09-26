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
    this.internalsirupdate = false
    
    // Characteristic.SecuritySystemCurrentState and Characteristic.SecuritySystemTargetState 
    
    var currentState = secsys.getCharacteristic(Characteristic.SecuritySystemCurrentState)

	.on('set', function(value,callback) {
		// nothing to do
	   if (callback) {callback();}
	}.bind(this))

    .on('get', function(callback) {
      that.query("4:ARMSTATE",function(value){
		  var hkValue = 0
		  // have to set target state also
		  that.internalsirupdate = true;
		  var ts = that.currentStateCharacteristic["TARGET"];
		  
		  switch (value) {
			
			case 0: 
				currentState.setValue(0,null);
				ts.updateValue(0,null);
				hkValue = 0
				break;
			case 1:
				currentState.setValue(2,null);
				ts.updateValue(2,null);
				hkValue = 2
				break;
			case 2:
				currentState.setValue(1,null);
				ts.updateValue(1,null);
				hkValue = 1
				break;
			case 3:
				currentState.setValue(3,null);
				ts.updateValue(3,null);
				hkValue = 3
				break;
			}
		  
		  that.internalsirupdate = false;
		  if (callback) {
			  callback(null,hkValue);
		  }
      });
    }.bind(this));

	that.currentStateCharacteristic["4:ARMSTATE"] = currentState;
    
	var ts = secsys.getCharacteristic(Characteristic.SecuritySystemTargetState)

	.on('get',function(callback){
	   if (callback) {callback();}
	}.bind(this))

    .on('set', function(value,callback) {
       if (that.internalsirupdate==false) {
	       
       var hmvalue = -1;
       if (value==3) {hmvalue = 3;}
       if (value==2) {hmvalue = 1;}
       if (value==1) {hmvalue = 2;}
       if (value==0) {hmvalue = 0;}
    
       if (hmvalue != -1) {
	       that.log.info("Set %s",hmvalue)
	       that.command("set","4:ARMSTATE" , hmvalue,function() {
		       that.remoteGetValue("4:ARMSTATE",function(value) {
			        if (value==1){currentState.setValue(Characteristic.SecuritySystemCurrentState.DISARMED,null);}
			        if (value==1){currentState.setValue(Characteristic.SecuritySystemCurrentState.NIGHT_ARM,null);}
			        if (value==2){currentState.setValue(Characteristic.SecuritySystemCurrentState.AWAY_ARM,null);}
			        if (value==0){currentState.setValue(Characteristic.SecuritySystemCurrentState.STAY_ARM,null);}
		       });
	       });
       }
       }
       
       if (callback) callback();
    }.bind(this));

	this.currentStateCharacteristic["TARGET"] = ts;


	this.remoteGetValue("4:ARMSTATE");

	this.addValueMapping("4:ARMSTATE",0,0);
    this.addValueMapping("4:ARMSTATE",1,2);
    this.addValueMapping("4:ARMSTATE",2,1);
    this.addValueMapping("4:ARMSTATE",3,3);
	
	this.addLowBatCharacteristic(secsys,Characteristic);

	this.deviceAdress = this.adress.slice(0, this.adress.indexOf(":"));
}

HomeMaticHomeKitSecuritySystem.prototype.endWorking=function()  {
   this.remoteGetValue("4:ARMSTATE");
}


HomeMaticHomeKitSecuritySystem.prototype.datapointEvent= function(dp,newValue) {
	if ((dp=='1:STATE') || (dp=='2:STATE') || (dp=='3:STATE')) {
	   if (newValue==true) {
		   var cs = this.currentStateCharacteristic["4:ARMSTATE"];
		   this.log.info("set alarm %s",cs);
		   cs.setValue(4, null);
	   } 
	}
	
	if (dp=="4:ARMSTATE") {
		this.log.debug("Send Armstate %s",newValue)
		var ts = this.currentStateCharacteristic["TARGET"];
		var cs = this.currentStateCharacteristic["4:ARMSTATE"];
		this.internalsirupdate = true;

		switch (newValue) {
			
			case 0: 
				cs.updateValue(0,null);
				ts.updateValue(0,null);
				break;
			case 1:
				cs.updateValue(2,null);
				ts.updateValue(2,null);
				break;
			case 2:
				cs.updateValue(1,null);
				ts.updateValue(1,null);
				break;
			case 3:
				cs.updateValue(3,null);
				ts.updateValue(3,null);
				break;
			
			
		}
		this.internalsirupdate = false
	}
	
 }

module.exports = HomeMaticHomeKitSecuritySystem; 