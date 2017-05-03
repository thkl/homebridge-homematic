'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitVariableUpdaterService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitVariableUpdaterService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitVariableUpdaterService, HomeKitGenericService);


HomeMaticHomeKitVariableUpdaterService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var vup = new Service.StatelessProgrammableSwitch(this.name);
	var cc = vup.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
		.on('set', function(value,callback) {
		// triggerd twice so only react on value = 1
		   if (value==1) {
			// Special is a list of my Variables so create a Rega Request
			var script = "";
			this.special.map(function(variable) {
			  script = script + "WriteLine('"+variable+"(---)'#dom.GetObject('"+variable+"').State());";
			});

			that.command("sendregacommand","",script,function(result) {
    		 // Parse result an set all Variables	
    		   result.split("\r\n").map( function(tmpvar) {
	    		 
	    		 var vn = tmpvar.split("(---)")[0];
	    		 var vv = tmpvar.split("(---)")[1];
	    		 if ((vn!=undefined) && (vv!=undefined)) {
				 	that.platform.remoteSetValue(vn,"STATE",vv);
	    		 }
	    		 
    		   });
	    	});
					
      		 if (callback) callback(null,value);
      	   }
	    }.bind(this));
    
		this.currentStateCharacteristic["PRESS_SHORT"] = cc;
		cc.eventEnabled = true;
	    this.services.push(vup);

}



module.exports = HomeMaticHomeKitVariableUpdaterService; 