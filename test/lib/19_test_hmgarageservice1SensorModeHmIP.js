'use strict'

const assert = require('assert')
const log = require('./logger')._system
const path = require('path')
const fs = require('fs')
const Characteristic = require('./characteristic-mock').Characteristic
const Service = require('./service-mock').Service

const homebridgeMock = require('./homebridge-mock')()

require('../../index')(homebridgeMock)

describe('Homematic Plugin (index)', function () {
  let datapath = path.join(__dirname, 'data', 'data_test_HmIP-garage_opener_service.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = {
    ccu_ip: '127.0.0.1',
    subsection: 'HomeKit',
    testdata: data,
    services: [{
      'type': 'Garage',
      'service': 'HomeMaticHomeKitGarageDoorService',
      'options': {
        'address_sensor_close': 'HmIP-RF.ADR1234567890:1.STATE',
        'address_actor_open': 'HmIP-RF.ADR1234567892:3.STATE',
        'message_actor_open': {
          'on': 1,
          'off': 0
        },
        'delay_actor_open': 1,
        'state_sensor_close': 0
      }
    }],
    special: [{
      'name': 'Garage'
    }]
  }
  var platform = new homebridgeMock.PlatformType(log, config, homebridgeMock)

  before(function () {
    log.debug('Init Platform with Garage Door Service HMIP 1 Sensor Mode')
    platform.homebridge.setCCUDummyValue('HmIP-RF.ADR1234567890:1.STATE', true)
    platform.homebridge.fireHomeBridgeEvent('didFinishLaunching')
    platform.xmlrpc.interface = 'HmIP-RF.'
    platform.homebridge.accessories(function (acc) {
      that.accessories = acc
    })
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.appliance.shutdown()
    })
  })

  describe('Homebridge Platform GarageDoor Service Test HMIP 1 Sensor Mode', function () {
    this.timeout(10000)

    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('SetDoorOpen - Expect TargetDoorState=Open CurrentDoorState=Open', function (done) {
      // send HmIP-RF.ADR1234567890:1.STATE a Open (1) Message
      platform.xmlrpc.event(['HmIP-RF.', 'ADR1234567890:1', 'STATE', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.GarageDoorOpener)
        assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
        let tc = s.getCharacteristic(Characteristic.TargetDoorState)
        assert.ok(tc, 'Characteristic.TargetDoorState not found in testdoor %s', ac.name)
        tc.getValue(function (context, value) {
          assert.strict.equal(value, Characteristic.TargetDoorState.OPEN)
        })

        // Wait 1,5 sec
        setTimeout(function () {
          let cc = s.getCharacteristic(Characteristic.CurrentDoorState)
          assert.ok(cc, 'Characteristic.CurrentDoorState not found in testdoor %s', ac.name)
          cc.getValue(function (context, value) {
            assert.strict.equal(value, Characteristic.CurrentDoorState.OPEN)
          })
          done()
        }, 1500)
      })
    })

    it('SetDoorClose - Expect TargetDoorState=Closed CurrentDoorState=Closed', function (done) {
      // Wait 2sec cause the first test used a timer
      setTimeout(function () {
        // send HmIP-RF.ADR1234567890:1.STATE a Close (0) Message
        platform.xmlrpc.event(['HmIP-RF.', 'ADR1234567890:1', 'STATE', 0])
        // check
        that.accessories.map(ac => {
          let s = ac.getService(Service.GarageDoorOpener)
          assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
          let tc = s.getCharacteristic(Characteristic.TargetDoorState)
          assert.ok(tc, 'Characteristic.TargetDoorState not found in testdoor %s', ac.name)
          tc.getValue(function (context, value) {
            assert.strict.equal(value, Characteristic.TargetDoorState.CLOSED)
          })
          // Wait 1,5 sec
          setTimeout(function () {
            let cc = s.getCharacteristic(Characteristic.CurrentDoorState)
            assert.ok(cc, 'Characteristic.CurrentDoorState not found in testdoor %s', ac.name)
            cc.getValue(function (context, value) {
              assert.strict.equal(value, Characteristic.CurrentDoorState.CLOSED)
            })
            done()
          }, 1500)
        })
      }, 2000)
    })

    it('Test Open Door - Expect address_actor_open = 1 and 1 sec later 0', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.getService(Service.GarageDoorOpener)
        assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
        let co = s.getCharacteristic(Characteristic.TargetDoorState)
        assert.ok(co, 'Characteristic.TargetDoorState not found in testdoor %s', ac.name)
        // Set Delay to 0 sec for use with tests
        ac.appliance.delayOnSet = 0
        co.emit('set', Characteristic.TargetDoorState.OPEN, function () {
          let res = platform.homebridge.getCCUDummyValue('HmIP-RF.ADR1234567892:3.STATE')
          assert.strict.equal(res, 1)
        })
        // wait 1.2 seconds the actor should turn off
        setTimeout(function () {
          let res = platform.homebridge.getCCUDummyValue('HmIP-RF.ADR1234567892:3.STATE')
          assert.strict.equal(res, 0)
          done()
        }, 1200)
      })
    })

    it('Test Close Door - Expect address_actor_open = 1 and 1 sec later 0', function (done) {
      // we have to delay this about 2 seconds
      setTimeout(function () {
        that.accessories.map(ac => {
          let s = ac.getService(Service.GarageDoorOpener)
          assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
          let co = s.getCharacteristic(Characteristic.TargetDoorState)
          assert.ok(co, 'Characteristic.TargetDoorState not found in testdoor %s', ac.name)
          // Set Delay to 0 sec for use with tests
          ac.appliance.delayOnSet = 0
          co.emit('set', Characteristic.TargetDoorState.CLOSE, function () {
            let res = platform.homebridge.getCCUDummyValue('HmIP-RF.ADR1234567892:3.STATE')
            assert.strict.equal(res, 1)
          })
          // wait 1.2 seconds the actor should turn off
          setTimeout(function () {
            let res = platform.homebridge.getCCUDummyValue('HmIP-RF.ADR1234567892:3.STATE')
            assert.strict.equal(res, 0)
            done()
          }, 1200)
        })
      }, 2000)
    })
  })
})
