
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
  let datapath = path.join(__dirname, 'data', 'data_test_HmIP-MOD-TM.json')
  let data = fs.readFileSync(datapath).toString()
  let that = this
  var config = { ccu_ip: '127.0.0.1', subsection: 'HomeKit', testdata: data }
  var platform = new homebridgeMock.PlatformType(log, config)

  before(function () {
    log.debug('Init Platform with DoorOpener')
    platform.accessories(function (acc) {
      that.accessories = acc
    })
    platform.xmlrpc.interface = 'HmIP-RF.'
  })

  after(function () {
    log.debug('Shutdown Platform')
    that.accessories.map(ac => {
      ac.shutdown()
    })
  })

  describe('Homebridge Platform GarageDoor IP Service Test', function () {
    it('test accessory build', function (done) {
      assert.ok(that.accessories, 'Did not find any accessories!')
      assert.strict.equal(that.accessories.length, 1)
      done()
    })

    it('test door open', function (done) {
      // send HmIP-RF.ADR1234567890:1.DOOR_RECEIVER a on Message
      platform.xmlrpc.event(['HmIP-RF.', 'ADR1234567890:2', 'DOOR_STATE', 1])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.GarageDoorOpener)
        assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CurrentDoorState)
        assert.ok(cc, 'Characteristic.CurrentDoorState not found in testdoor %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 0)
        })
      })
      done()
    })

    it('test door close', function (done) {
      // Switch Off
      platform.xmlrpc.event(['HmIP-RF.', 'ADR1234567890:1', 'DOOR_STATE', 0])
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.GarageDoorOpener)
        assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
        let cc = s.getCharacteristic(Characteristic.CurrentDoorState)
        assert.ok(cc, 'Characteristic.CurrentDoorState not found in testdoor %s', ac.name)
        cc.getValue(function (context, value) {
          assert.strict.equal(value, 1)
        })
      })
      done()
    })

    it('close door via HK', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.GarageDoorOpener)
        assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
        let co = s.getCharacteristic(Characteristic.TargetDoorState)
        assert.ok(co, 'Characteristic.TargetDoorState not found in testdoor %s', ac.name)
        co.emit('set', 1, function () {
          let res = platform.homebridge.values[ac.adress + '.DOOR_COMMAND']
          assert.strict.equal(res, 3)
        })
      })
      done()
    })

    it('open door via HK', function (done) {
      // check
      that.accessories.map(ac => {
        let s = ac.get_Service(Service.GarageDoorOpener)
        assert.ok(s, 'Service.GarageDoorOpener not found in testdoor %s', ac.name)
        let co = s.getCharacteristic(Characteristic.TargetDoorState)
        assert.ok(co, 'Characteristic.TargetDoorState not found in testdoor %s', ac.name)
        co.emit('set', 0, function () {
          let res = platform.homebridge.values[ac.adress + '.DOOR_COMMAND']
          assert.strict.equal(res, 1)
        })
      })
      done()
    })
  })
})
