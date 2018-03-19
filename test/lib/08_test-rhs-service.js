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

  let datapath = path.join(__dirname,'data','data_test_rhs.json')
  let data = fs.readFileSync(datapath).toString();
  let that = this
  var config = { ccu_ip: '127.0.0.1',subsection :'HomeKit', testdata:data };
  var platform = new homebridgeMock.PlatformType(log, config);

  before(function() {
    log.debug('Init Platform with Switch');
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


  describe("Homebridge Platform RHS Service Test", function() {

    it('test accessory build', function (done) {
      assert.ok(that.accessories, "Did not find any accessories!");
      assert.equal(that.accessories.length, 1);
      done();
    });

    it('test RHS close', function (done) {
      platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','STATE',0]);
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.ContactSensor)
        assert.ok(s, "Service.ContactSensor not found in rhs %s",ac.name);
        let cc = s.getCharacteristic(Characteristic.ContactSensorState)
        assert.ok(cc, "Characteristic.ContactSensorState not found in rhs %s",ac.name);
        cc.getValue(function(context,value){
          assert.equal(value, 0);
        });
      })
      done();
    });

    it('test rhs open', function (done) {
      platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','STATE',1]);
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.ContactSensor)
        assert.ok(s, "Service.ContactSensor not found in rhs %s",ac.name);
        let cc = s.getCharacteristic(Characteristic.ContactSensorState)
        assert.ok(cc, "Characteristic.ContactSensorState not found in rhs %s",ac.name);
        cc.getValue(function(context,value){
          assert.equal(value, 1);
        });
      })
      done();
    });
  });
});
