'use strict';

const path = require('path');
const util = require("util");
const fs = require('fs');
var HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService;


function HomeMaticHomeKitSwitchService(log,platform, id ,name, type ,adress,special, cfg, Service, Characteristic) {
  HomeMaticHomeKitSwitchService.super_.apply(this, arguments);
}

util.inherits(HomeMaticHomeKitSwitchService, HomeKitGenericService);


HomeMaticHomeKitSwitchService.prototype.createDeviceService = function(Service, Characteristic) {
  let that = this;
  this.ignoreWorking = true;
  this.delayOnSet = 1000;

  if (this.special=="PROGRAM") {
    this.createProgrammService(Service, Characteristic)
  }

  else

  if (this.special=="VALVE") {
    let str_path = path.join(this.platform.localPath,this.adress) + '.json'
    if (fs.existsSync(str_path)) {
      let data = fs.readFileSync(str_path).toString()
      if (data != undefined) {
        try {
          var jData = JSON.parse(data)
          this.setDuration = jData['duration']
        } catch (e) {
          this.setDuration = 0
        }
      } else {
        this.setDuration = 0
      }
    }
    that.remainTime = 0
    this.createValveService(Service, Characteristic)
  }

  else

  if (this.special=="OUTLET") {
    this.createOutletService(Service, Characteristic)
    this.addCoreSwitchFunctions(Service, Characteristic)
  }

  else {
    this.createLightBulbService(Service, Characteristic)
    this.addCoreSwitchFunctions(Service, Characteristic)
  }

  this.services.push(this.service_item);
  this.queryState();
}

HomeMaticHomeKitSwitchService.prototype.createProgrammService = function(Service, Characteristic) {
  let that = this
  this.service_item = new Service.Outlet(this.name);
  this.service_item.getCharacteristic(Characteristic.OutletInUse)
  .on('get', function(callback) {
    if (callback) callback(null,1);
  }.bind(this));

  this.c_isOn = this.service_item.getCharacteristic(Characteristic.On)
  .on('get', function(callback) {
    if (callback) callback(null,0);
  }.bind(this))

  .on('set', function(value, callback) {
    if (value==1) {
      that.log.debug("Launch Program " + that.adress);
      that.command("sendregacommand","","var x=dom.GetObject(\""+that.adress+"\");if (x) {x.ProgramExecute();}",function() {
      });

      setTimeout(function() {
        that.c_isOn.setValue(0, null);
      },that.delayOnSet);
    }
    callback(0);
  }.bind(this));
}

HomeMaticHomeKitSwitchService.prototype.addCoreSwitchFunctions = function(Service, Characteristic) {
  let that = this
  this.c_isOn = this.service_item.getCharacteristic(Characteristic.On)

  .on('get', function(callback) {
    that.query("STATE",function(value){
      if (callback) callback(null,value);
    });
  }.bind(this))

  .on('set', function(value, callback) {

    if (that.readOnly==false) {
      var onTime = that.state['ON_TIME'];
      if ((onTime!=undefined) && (onTime>0) && (value==1)) {
        that.command("set","ON_TIME" , onTime)
      }
      if (value==0) {
        that.delayed("set","STATE" , false)
      } else {
        that.delayed("set","STATE" , true)
      }
    }

    callback();
  }.bind(this));

  var onTimeProperties = {
    format: Characteristic.Formats.FLOAT,
    unit: Characteristic.Units.SECONDS,
    minValue: 0,
    maxValue: 3600.0, // normally defined as 85825945.6 but that`s in Hesperus inconvenient and unusable
    minStep: 1,
    perms: [Characteristic.Perms.WRITE]
  };

  var on_time = new Characteristic("OnTime","CEA288AC-EAC5-447A-A2DD-D684E4517440", onTimeProperties)
  .on('set', function(value, callback) {
    that.state['ON_TIME']=value;
    callback();
  }.bind(this));

  on_time.eventEnabled = true;
  this.service_item.addCharacteristic(on_time);

  this.currentStateCharacteristic["STATE"] = this.c_isOn;
  this.c_isOn.eventEnabled = true;
}


HomeMaticHomeKitSwitchService.prototype.shutdown = function() {
  clearTimeout(this.valveTimer)
}


HomeMaticHomeKitSwitchService.prototype.createLightBulbService = function(Service, Characteristic) {
  this.service_item = new Service.Lightbulb(this.name);
}

HomeMaticHomeKitSwitchService.prototype.createOutletService = function(Service, Characteristic) {
  this.service_item = new Service.Outlet(this.name);
  this.service_item.getCharacteristic(Characteristic.OutletInUse)
  .on('get', function(callback) {
    if (callback) callback(null,1);
  }.bind(this));
}

HomeMaticHomeKitSwitchService.prototype.createValveService = function(Service, Characteristic) {
  let that = this
  this.service_item = new Service.Valve(this.name);
  this.remainTime = -99;

  var configured = this.service_item.getCharacteristic(Characteristic.IsConfigured)
  .on('get', function(callback) {
    callback(null,Characteristic.IsConfigured.CONFIGURED);
  }.bind(this));

  configured.updateValue(Characteristic.IsConfigured.CONFIGURED,null);

  var valveType = this.service_item.getCharacteristic(Characteristic.ValveType)
  .on('get', function(callback) {
    callback(null,Characteristic.ValveType.IRRIGATION);
  }.bind(this));

  valveType.updateValue(Characteristic.ValveType.IRRIGATION,null)

  this.service_item.getCharacteristic(Characteristic.SetDuration)
  .on('get', function(callback) {
    that.log.debug('get Characteristic.SetDuration')
    callback(null,that.setDuration)
  }.bind(this))

  .on('set', function(value,callback) {
    that.setDuration = value
    that.log.debug('set Characteristic.SetDuration %s',value)

    let str_path = path.join(that.platform.localPath,that.adress) + '.json'
    fs.writeFileSync(str_path, JSON.stringify({duration:that.setDuration}))

    callback()
  }.bind(this));


  this.c_isActive = this.service_item.getCharacteristic(Characteristic.Active)
  .on('get', function(callback) {
    that.log.debug('get Active')
    that.query("STATE",function(value){
      let hmState = ((value=='true') || (value==true)) ? 1 : 0;
      if (callback) callback(null,hmState);
    });
  }.bind(this))

  .on('set', function(value,callback) {
    if (value==0) {
      that.command("setrega","STATE" , 0)
      that.remainTime = 0
      clearTimeout(that.valveTimer)
      callback();
    } else {
      that.remainTime = (that.setDuration) ? that.setDuration : 0;
      that.isInUse = 1
      if (that.remainTime > 0) {
        that.command("setrega","ON_TIME" , that.remainTime,function(){
          that.command("setrega","STATE" , 1)
          that.updateValveTimer()
          callback();
        })
      } else {
        that.command("setrega","STATE" , 1)
        callback();
      }
    }
  }.bind(this));

  this.c_isActive.updateValue(Characteristic.Active.ACTIVE,null)


  this.c_isInUse = this.service_item.getCharacteristic(Characteristic.InUse)
  .on('get', function(callback) {
    that.log.debug('get Active')
    that.query("STATE",function(value){
      let hmState = ((value=='true') || (value==true)) ? 1 : 0;
      if (callback) callback(null,hmState);
    });
  }.bind(this))

  .on('set', function(value, callback) {
    that.isInUse = value;
    callback();
  }.bind(this))


  this.c_timeRemain = this.service_item.getCharacteristic(Characteristic.RemainingDuration)
  .on('get', function(callback) {
    callback(null,that.remainTime);
  }.bind(this))

}

HomeMaticHomeKitSwitchService.prototype.updateValveTimer = function(){
    let that = this
    if (this.remainTime == 0) {
      return
    }

    this.remainTime = this.remainTime - 1;
    // SET OFF
    if (this.remainTime == 0) {
      that.command("setrega","STATE" , 0)
      clearTimeout(this.valveTimer)
      that.queryState();
    }
    this.c_timeRemain.updateValue(this.remainTime,null)
    this.valveTimer = setTimeout(function(){
          that.updateValveTimer()
    },1000)
}

HomeMaticHomeKitSwitchService.prototype.queryState = function(){
  let that = this
  this.remoteGetValue('STATE',function(result){
    let parts = that.adress.split('.')
    that.event(parts[0]+'.' +parts[1],'STATE',result)
  })
}

HomeMaticHomeKitSwitchService.prototype.datapointEvent = function(dp,newValue){
  if (dp =='STATE') {
    let hmState = ((newValue=='true') || (newValue==true)) ? 1 : 0;

    if (hmState == 0) {
      this.remainTime = 0
      if (this.c_timeRemain != undefined) {
        this.c_timeRemain.updateValue(this.remainTime,null)
      }
    }

    if (this.c_isActive != undefined) {
      this.c_isActive.updateValue(hmState)
    }

    if (this.c_isOn != undefined) {
      this.c_isOn.updateValue(hmState)
    }

    if (this.c_isInUse != undefined) {
      this.c_isInUse.updateValue(hmState)
    }
  }
}


module.exports = HomeMaticHomeKitSwitchService
