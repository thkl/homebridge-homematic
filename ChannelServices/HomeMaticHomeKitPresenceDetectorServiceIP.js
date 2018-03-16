'use strict'

var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
var util = require('util')
var moment = require('moment')

function HomeMaticHomeKitPresenceDetectorServiceIP(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitPresenceDetectorServiceIP.super_.apply(this, arguments)
}

util.inherits(HomeMaticHomeKitPresenceDetectorServiceIP, HomeKitGenericService)


HomeMaticHomeKitPresenceDetectorServiceIP.prototype.createDeviceService = function(Service, Characteristic) {

  var that = this
  var FakeGatoHistoryService = require('./fakegato-history.js')(this.platform.homebridge)
  this.log.debug('Adding Log Service for %s',this.displayName)
  this.loggingService = new FakeGatoHistoryService('motion', this, {storage: 'fs', path: this.platform.localCache, file:this.adress})
  this.services.push(this.loggingService)


  var sensor = new Service.MotionSensor(this.name)
  var state = sensor.getCharacteristic(Characteristic.MotionDetected)
  .on('get', function(callback) {
    that.query('PRESENCE_DETECTION_STATE',function(value){
      that.loggingService.addEntry({time: moment().unix(), status:(value==true)?1:0})
      if (callback) callback(null,value)
    })
  }.bind(this))

  this.currentStateCharacteristic['PRESENCE_DETECTION_STATE'] = state
  state.eventEnabled = true
  this.services.push(sensor)

  this.remoteGetValue('PRESENCE_DETECTION_STATE')

  var brightness = new Service.LightSensor(this.name)
  var cbright = brightness.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
  .on('get', function(callback) {
    that.query('ILLUMINATION',function(value){
      callback(null,value/10)
    })
  }.bind(this))

  this.currentStateCharacteristic['ILLUMINATION'] = cbright
  cbright.eventEnabled= true
  this.services.push(brightness)

  this.addTamperedCharacteristic(sensor,Characteristic)
  this.addLowBatCharacteristic(sensor,Characteristic)
}

HomeMaticHomeKitPresenceDetectorServiceIP.prototype.datapointEvent= function(dp,newValue) {
  if (dp=='PRESENCE_DETECTION_STATE') {
    this.loggingService.addEntry({time: moment().unix(), status:(newValue==true)?1:0})
  }
}



module.exports = HomeMaticHomeKitPresenceDetectorServiceIP
