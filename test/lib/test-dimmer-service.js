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

  let datapath = path.join(__dirname,'data','data_test_dimmer.json')
  let data = fs.readFileSync(datapath).toString();
  let that = this
  var config = { ccu_ip: '127.0.0.1',subsection :'HomeKit' , testdata:data};
  var platform = new homebridgeMock.PlatformType(log, config);

  before(function() {
    log.debug('Init Platform with Dimmer');
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

  describe("Homebridge Platform Dimmer Service Test", function() {

    it('check accessory build', function (done) {
        assert.ok(that.accessories, "Did not find any accessories!");
        assert.equal(that.accessories.length, 3);
        done();
    });


    it('test Dimmer service Level 100%', function (done) {
          // send BidCos-RF.ABC1234560:1.STATE a on Message
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','LEVEL',1]);
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:2','LEVEL',1]);
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:3','LEVEL',1]);
          // check
          that.accessories.map(ac => {
            let s = ac.get_Service(Service.Lightbulb)
            assert.ok(s, "Service.Lightbulb not found in testswitch %s",ac.name);
            let cc = s.getCharacteristic(Characteristic.On)
            assert.ok(cc, "Characteristic.On not found in testswitch %s",ac.name);
            cc.getValue(function(context,value){
              assert.equal(value, true);
            });

            let cl = s.getCharacteristic(Characteristic.Brightness)
            assert.ok(cl, "Characteristic.Brightness not found in testswitch %s",ac.name);
            cl.getValue(function(context,value){
              assert.equal(value, 100);
            });
          });
       done();
     });

     it('test Dimmer service Level 0%', function (done) {
          // Switch Off
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','LEVEL',0]);
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:2','LEVEL',0]);
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:3','LEVEL',0]);
          // check
          that.accessories.map(ac => {
            let s = ac.get_Service(Service.Lightbulb)
            assert.ok(s, "Service.Lightbulb not found in testswitch %s",ac.name);
            let cc = s.getCharacteristic(Characteristic.On)
            assert.ok(cc, "Characteristic.On not found in testswitch %s",ac.name);
            cc.getValue(function(context,value){
              assert.equal(value, false);
            });

            let cl = s.getCharacteristic(Characteristic.Brightness)
            assert.ok(cl, "Characteristic.Brightness not found in testswitch %s",ac.name);
            cl.getValue(function(context,value){
              assert.equal(value, 0);
            });
          })
          done();
      });

 });
});
