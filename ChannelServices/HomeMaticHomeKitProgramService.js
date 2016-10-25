'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitProgramService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
   HomeMaticHomeKitProgramService.super_.apply(this, arguments);

}

util.inherits(HomeMaticHomeKitProgramService, HomeKitGenericService);


HomeMaticHomeKitProgramService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
  Characteristic.ProgramLaunchCharacteristic = function() {
    Characteristic.call(this, 'Program', "5E0115D7-7594-4846-AFB7-F456389E81EC");
    this.setProps({
        format: Characteristic.Formats.BOOL,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
            });
    this.value = this.getDefaultValue();
  };
  util.inherits(Characteristic.ProgramLaunchCharacteristic, Characteristic);


  Service.ProgramLaunchService = function(displayName, subtype) {
  	Service.call(this, displayName, 'B7F46B4D-3D69-4804-8114-393F257D4039', subtype);
    this.addCharacteristic(Characteristic.ProgramLaunchCharacteristic);
  };

  util.inherits(Service.ProgramLaunchService, Service);
}

HomeMaticHomeKitProgramService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    var prg = new Service["ProgramLaunchService"](this.name);
    this.services.push(prg);

    var pgrl = prg.getCharacteristic(Characteristic.ProgramLaunchCharacteristic)

    .on('get', function(callback) {
      if (callback) callback(null,0);
    }.bind(this))

    .on('set', function(value, callback) {
      if (value==1) {
      
        that.log("Launch Program " + that.name);
        that.command("sendregacommand","","var x=dom.GetObject(\""+that.name+"\");if (x) {x.ProgramExecute();}",function() {
    		
    	});
    	
    	setTimeout(function() {
    		pgrl.setValue(0, null);
    
    	},1000);
    	
      }
      callback(0);
    }.bind(this));

    pgrl.eventEnabled = true;

}



module.exports = HomeMaticHomeKitProgramService; 