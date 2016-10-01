'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitVariableService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitVariableService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitVariableService, HomeKitGenericService);


HomeMaticHomeKitVariableService.prototype.createDeviceService = function(Service, Characteristic) {

	var that = this;
    this.usecache = false;
      var vservice = new Service["Switch"](this.name);
      this.services.push(vservice);

      var cc = vservice.getCharacteristic(Characteristic.On)
      
      .on('get', function(callback) {
         that.remoteGetValue("STATE",function(value){
           if (callback) callback(null,value);
         });
      }.bind(this))

      .on('set', function(value, callback) {
         that.command("sendregacommand","","var x=dom.GetObject(\""+that.name+"\");if (x) {x.State("+value+");}",function() {
		   setTimeout(function() {
       			that.remoteGetValue("STATE");
      		},500);
		});
		 
         callback();
      }.bind(this));

	  this.currentStateCharacteristic["STATE"] = cc;
      cc.eventEnabled = true;
    
      this.addValueMapping("STATE",false,0);
      this.addValueMapping("STATE",true,1);
      this.remoteGetValue("STATE");

}



module.exports = HomeMaticHomeKitVariableService; 