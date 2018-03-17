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

  describe("Homebridge Platform Switch Service Test", function() {

      it('test switch service', function (done) {
        let datapath = path.join(__dirname,'data','data_test_switch.json')
        let data = fs.readFileSync(datapath).toString();
        let that = this
        var config = { ccu_ip: '127.0.0.1',subsection :'HomeKit',testapi:'default' , testdata:data};
        var platform = new homebridgeMock.PlatformType(log, config);
        platform.accessories(function(acc) {
          assert.ok(acc, "Did not find any accessories!");
          assert.equal(acc.length, 2);

          // send BidCos-RF.ABC1234560:1.STATE a on Message
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','STATE',true]);
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:2','STATE',true]);
          // check
          acc.map(ac => {
            let s = ac.get_Service(Service.Lightbulb)
            assert.ok(s, "Service.Lightbulb not found in testswitch %s",ac.name);
            let cc = s.getCharacteristic(Characteristic.On)
            assert.ok(cc, "Characteristic.On not found in testswitch %s",ac.name);
            cc.getValue(function(context,value){
              assert.equal(value, true);
            });
          })

          // Switch Off
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:1','STATE',false]);
          platform.xmlrpc.event(['BidCos-RF','ABC1234560:2','STATE',false]);
          // check
          acc.map(ac => {
            let s = ac.get_Service(Service.Lightbulb)
            assert.ok(s, "Service.Lightbulb not found in testswitch %s",ac.name);
            let cc = s.getCharacteristic(Characteristic.On)
            assert.ok(cc, "Characteristic.On not found in testswitch %s",ac.name);
            cc.getValue(function(context,value){
              assert.equal(value, false);
            });
          })

          // check if the switch
          acc.map(ac => {
            ac.shutdown()
          })

          done();
        });
      });
  });
});
