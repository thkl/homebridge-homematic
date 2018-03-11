'use strict';

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;
var util = require("util");


function HomeMaticHomeKitGarageDoorService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
    HomeMaticHomeKitGarageDoorService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitGarageDoorService, HomeKitGenericService);


HomeMaticHomeKitGarageDoorService.prototype.propagateServices = function(homebridge, Service, Characteristic) {
    
  // Register new Characteristic or Services here
  
}



HomeMaticHomeKitGarageDoorService.prototype.createDeviceService = function(Service, Characteristic) {

	let that = this
	this.characteristic = Characteristic
	this.log.debug(JSON.stringify(this.cfg))
	this.adress_close = this.getClazzConfigValue('adress_device_close',undefined)
	this.adress_open = this.getClazzConfigValue('adress_device_open',undefined)
	
	this.state_close = this.getClazzConfigValue('state_close',true)
	this.state_open = this.getClazzConfigValue('state_open',true)
	
	this.adress_actor_open = this.getClazzConfigValue('adress_actor_open',undefined)
	this.adress_actor_close = this.getClazzConfigValue('adress_actor_close',undefined)

	this.delay_actor_open = this.getClazzConfigValue('delay_actor_open',5)
	this.delay_actor_close = this.getClazzConfigValue('delay_actor_close',5)
	
	this.targetCommand = false
	
	if ((this.adress_close == undefined) && (this.adress_open == undefined)) {
		this.log.error('Cannot initialize Garage Device adress for open or close detection is missing')
	}

	if ((this.adress_actor_open == undefined) && (this.adress_actor_close == undefined)) {
		this.log.error('Cannot initialize Garage Device adress for open or close actors is missing')
	}

	
	var garagedoorService = new Service.GarageDoorOpener(this.name);
	this.services.push(garagedoorService);


	this.obstacle = garagedoorService.getCharacteristic(Characteristic.ObstructionDetected)
	.on('get', function(callback) {
		if (callback) callback(null,false);
	}.bind(this));


	this.currentDoorState = garagedoorService.getCharacteristic(Characteristic.CurrentDoorState)

    .on('get', function(callback) {
       var return_value = Characteristic.CurrentDoorState.STOPPED
       
       if ((that.adress_close != undefined) && (that.adress_open != undefined)) {
	   		// We have two contacts so ask for boath levels 
	   		that.remoteGetDeviceValue(that.adress_close,'STATE',function(close_value){
	   			that.remoteGetDeviceValue(that.adress_open,'STATE',function(open_value){
	   				if ((close_value == that.state_close) && (open_value != that.state_open)) {
		   				return_value = Characteristic.CurrentDoorState.CLOSED
		   				if (that.targetCommand) {that.targetDoorState.updateValue(that.characteristic.TargetDoorState.CLOSED,null)}
		   			}

	   				if ((close_value != that.state_close) && (open_value != that.state_open)) {
		   				return_value = Characteristic.CurrentDoorState.OPENING // or closing its moving
		   			}

	   				if ((close_value != that.state_close) && (open_value == that.state_open)) {
		   				return_value = Characteristic.CurrentDoorState.OPEN
		   				if (that.targetCommand) {that.targetDoorState.updateValue(that.characteristic.TargetDoorState.OPEN,null)}
		   			}

		   			if (callback) callback(null,return_value);
	   			})
	   		})
	   }
	   
	   if ((that.adress_close != undefined) && (that.adress_open == undefined)) {    
       	// There is only one contact 
       	   that.remoteGetDeviceValue(that.adress_close,'STATE',function(close_value){
	   	   		if (close_value == that.state_close) {
		   			return_value = Characteristic.CurrentDoorState.CLOSED
		   		} else {
		   			return_value = Characteristic.CurrentDoorState.OPEN
				}			   		
		   		if (callback) callback(null,return_value);
			})
       }
    
    }.bind(this));
    
    
    this.targetDoorState = garagedoorService.getCharacteristic(Characteristic.TargetDoorState)
	.on('set', function(value,callback) {
		that.targetCommand = true
		if ((that.adress_actor_open != undefined) && (that.adress_actor_close == undefined)) {
			// there is only one actor
			if (value == Characteristic.TargetDoorState.OPEN) {
				that.currentDoorState.updateValue(that.characteristic.CurrentDoorState.OPENING,null)
			} else {
				that.currentDoorState.updateValue(that.characteristic.CurrentDoorState.CLOSING,null)
			}
			
			
			that.remoteSetDeviceValue(that.adress_actor_open,'STATE',true)
			setTimeout(function() {
				that.remoteSetDeviceValue(that.adress_actor_open,'STATE',false)
			},1000*that.delay_actor_open)
			
		} else {
			// there is a actor for every direction so 
			if (value == Characteristic.TargetDoorState.OPEN) {
				that.currentDoorState.updateValue(that.characteristic.CurrentDoorState.OPENING,null)
				that.remoteSetDeviceValue(that.adress_actor_open,'STATE',true)
				setTimeout(function() {
					that.remoteSetDeviceValue(that.adress_actor_open,'STATE',false)
				},1000*that.delay_actor_open)
			} else {
				that.remoteSetDeviceValue(that.adress_actor_close,'STATE',true)
				that.currentDoorState.updateValue(that.characteristic.CurrentDoorState.CLOSING,null)
				setTimeout(function() {
					that.remoteSetDeviceValue(that.adress_actor_close,'STATE',false)
				},1000*that.delay_actor_close)
			}
		}

	}.bind(this))
	
	
	// register for status events
	if (this.adress_close != undefined) {
		let parts = this.adress_close.split('.')
		this.adress = parts[0] + "." + parts[1]
	}

	if (this.adress_open != undefined) {
		let parts = this.adress_open.split('.')
		this.cadress = parts[0] + "." + parts[1]
	}
	
	this.currentDoorState.eventEnabled = true;
}


HomeMaticHomeKitGarageDoorService.prototype.event = function(channel,dp,newValue){
	// Chech sensors
	let that = this
   
	if ((this.adress_close != undefined) && (this.adress_open != undefined)) {
	   // we have two sensors
	   if ((channel == this.adress_close) && (newValue == this.state_close)) {
		   // Sensor Close said its closed
		   this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.CLOSED,null)
		   this.targetCommand = false
	   }
	   
	   if ((channel == this.adress_close) && (newValue != this.state_close)) {
		   // Sensor Close just opened so the door is moving to open position
		   if (this.targetCommand) {this.targetDoorState.updateValue(this.characteristic.TargetDoorState.OPEN)}
		   this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.OPENING,null)
	   }

	   if ((channel == this.adress_open) && (newValue == this.state_open)) {
		   // Sensor Open said its open
		   this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.OPEN,null)
		   this.targetCommand = false
	   }
	   
	   if ((channel == this.adress_open) && (newValue != this.state_open)) {
		   // Sensor open just went to false so the door is moving to close position
		   if (this.targetCommand) {this.targetDoorState.updateValue(this.characteristic.TargetDoorState.CLOSED)}
		   this.currentDoorState.updateValue(this.characteristic.CurrentDoorState.CLOSING,null)
	   }
	   
		   
   } else {
	   // we only have one sensor if its the close sensor the door is closed on sensor true
	   if (channel == this.adress_close) {
		   // first set a new target state but ony if the target was not set by homekit first
		  if (this.targetCommand == false) {
			  let newState = (newValue==that.state_close) ? this.characteristic.TargetDoorState.CLOSED:this.characteristic.TargetDoorState.OPEN
			  this.log.debug('Close sensor set new target state %s',newState)
			  this.targetDoorState.updateValue(newState,null) 
		  }
		  // wait one second cause we have a really fast going garage door
		  setTimeout(function() {
			  let newState = (newValue==that.state_close)?that.characteristic.CurrentDoorState.CLOSED:that.characteristic.CurrentDoorState.OPEN
			  that.log.debug('Close sensor set new current state %s',newState)
			  that.currentDoorState.updateValue(newState,null)
		  },1000)
	   }
	   
	   if (channel == this.adress_open) {
		  
		  if (this.targetCommand == false) { 
			  let newState = (newValue==this.state_open)?that.characteristic.TargetDoorState.OPEN:this.characteristic.TargetDoorState.CLOSED
			  this.log.debug('open sensor set new target state %s',newState)
			  this.targetDoorState.updateValue(newState,null) 
		  }
	   	  
	   	  setTimeout(function() {
		   	  let newState = (newValue==that.state_open)?that.characteristic.CurrentDoorState.OPEN:that.characteristic.CurrentDoorState.CLOSED
			  that.log.debug('open sensor set new state %s',newState)
			  that.currentDoorState.updateValue(newState,null)
		  },1000)
	   }
	   
	   this.targetCommand = false
   }
}

module.exports = HomeMaticHomeKitGarageDoorService; 