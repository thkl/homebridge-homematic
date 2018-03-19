'use strict'

const assert = require('assert');
const log = require("./logger")._system;
const path = require('path');
const fs = require('fs');
const Characteristic = require('./characteristic-mock').Characteristic;
const Service = require('./service-mock').Service;

const homebridgeMock = require('./homebridge-mock')();

require("../../index")(homebridgeMock);

describe("Homematic Plugin (index)", function() {

  let datapath = path.join(__dirname,'data','data_test_switch.json')
  let data = fs.readFileSync(datapath).toString();
  let that = this
  
  var config = { ccu_ip: '127.0.0.1',subsection :'HomeKit', testdata:data , valves :['BidCos-RF.ABC1234560:1']};
  var platform = new homebridgeMock.PlatformType(log, config);

  before(function() {
    log.debug('Init Platform with Switch (Sprinkler mode)');
    platform.accessories(function(acc) {
      that.accessories = acc;
    })
  });

  after(function() {
    log.debug('Shutdown Platform');
    that.accessories.map(ac => {
      ac.shutdown()
    });
  });


  describe("Homebridge Platform Switch(Sprinkler mode) Service Test", function() {

    it('test accessory build', function (done) {
      assert.ok(that.accessories, "Did not find any accessories!");
      assert.equal(that.accessories.length, 2);
      // Check the correct type for AC1
      let ac = that.accessories[0];
      let s = ac.get_Service(Service.Valve)
      assert.ok(s, "%s is not Service.Valve !",ac.name);
      // Check Initial Remain Time -> 0
      assert.equal(ac.remainTime, 0 ,'Time remain is not 0');
      done();
    });

    it('test switch valve on', function (done) {
      // send BidCos-RF.ABC1234560:1.STATE a on Message
      platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','STATE',true]);
      // check
      let ac = that.accessories[0];
      let s = ac.get_Service(Service.Valve)
      assert.ok(s, "Service.Valve not found in sprinkler %s",ac.name);
      let ca = s.getCharacteristic(Characteristic.Active)
      assert.ok(ca, "Characteristic.Active not found in sprinkler %s",ac.name);
      let ciu = s.getCharacteristic(Characteristic.InUse)
      assert.ok(ciu, "Characteristic.InUse not found in sprinkler %s",ac.name);
      // should both be 1
      ca.getValue(function(context,value){assert.equal(value, true);});
      ciu.getValue(function(context,value){assert.equal(value, true);});
      done();
    });

    it('test switch valve off', function (done) {
      // Switch Off
      platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','STATE',false]);
      // check
      let ac = that.accessories[0];
      let s = ac.get_Service(Service.Valve)
      assert.ok(s, "Service.Valve not found in sprinkler %s",ac.name);
      let ca = s.getCharacteristic(Characteristic.Active)
      assert.ok(ca, "Characteristic.Active not found in sprinkler %s",ac.name);
      let ciu = s.getCharacteristic(Characteristic.InUse)
      assert.ok(ciu, "Characteristic.InUse not found in sprinkler %s",ac.name);
      // should both be off
      ca.getValue(function(context,value){assert.equal(value, false);});
      ciu.getValue(function(context,value){assert.equal(value, false);});
      // time remain should set to 0
      assert.equal(ac.remainTime,0);
      done();
    });

    it('set switch valve to on via HK (SetDuration to 0)', function (done) {
      // check
      let ac = that.accessories[0];
      let s = ac.get_Service(Service.Valve)
      assert.ok(s, "Service.Valve not found in sprinkler %s",ac.name);
      let ca = s.getCharacteristic(Characteristic.Active)
      assert.ok(ca, "Characteristic.Active not found in sprinkler %s",ac.name);
      let ciu = s.getCharacteristic(Characteristic.InUse)
      assert.ok(ciu, "Characteristic.InUse not found in sprinkler %s",ac.name);
      ca.emit('set', 1 ,function(){
        let res = platform.homebridge.values[ac.adress + '.STATE'];
        assert.equal(res,1);
        // Time remain > 0
        assert.equal(ac.remainTime , 0,'Time remain is %s should be 0');
      });
      done();
    });

    it('set switch valve to on via HK (SetDuration to 100 - check Timer)', function (done) {
      // check
      let ac = that.accessories[0];
      let s = ac.get_Service(Service.Valve)
      assert.ok(s, "Service.Valve not found in sprinkler %s",ac.name);
      let ca = s.getCharacteristic(Characteristic.Active)
      assert.ok(ca, "Characteristic.Active not found in sprinkler %s",ac.name);
      let ciu = s.getCharacteristic(Characteristic.InUse)
      assert.ok(ciu, "Characteristic.InUse not found in sprinkler %s",ac.name);
      // switch Valve off
      ca.emit('set', 0 ,function(){});
      // set new duration time -> do not use SetDuration Characteristic there is no cache
      ac.setDuration = 100;

      ca.emit('set', 1 ,function(){
        let res = platform.homebridge.values[ac.adress + '.STATE'];
        assert.equal(res,1);
        // Time remain > 0
        assert((ac.remainTime>90),'Time remain is not > 90');
      });
      done();
    });

  });
});
