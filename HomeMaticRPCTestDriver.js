'use strict'

var isInTest = typeof global.it === 'function'
const HomeMaticAddress = require('./HomeMaticAddress.js')

var HomeMaticRPCTestDriver = function (log, ccuip, port, system, ccumanager) {
  this.log = log
  this.system = system
  this.ccuip = ccuip
  this.ccumanager = ccumanager
  this.platform = ccumanager.platform
  this.homebridge = this.platform.homebridge
  this.interface = 'BidCos-RF.'
}

HomeMaticRPCTestDriver.prototype.init = function () {
  if (!isInTest) {
    this.log.warn('Rega Dummy Class for Tests only it looks like i am running in production mode.')
  }
}

HomeMaticRPCTestDriver.prototype.getIPAddress = function () {
  return '0.0.0.0'
}

HomeMaticRPCTestDriver.prototype.getValue = function (channel, datapoint, callback) {
  if (this.homebridge !== undefined) {
    var adrchannel = channel + '.' + datapoint
    if (channel.indexOf(this.interface) === -1) {
      adrchannel = this.interface + channel + '.' + datapoint
    }
    let result = this.homebridge.getCCUDummyValue(adrchannel)
    this.log.debug('RPC Query %s (%s)', adrchannel, result)
    callback(result)
  } else {
    let result = 0
    callback(result)
  }
}

HomeMaticRPCTestDriver.prototype.setValue = function (channel, datapoint, value) {
  var adrchannel = channel + '.' + datapoint
  if (channel.indexOf(this.interface) === -1) {
    adrchannel = this.interface + channel + '.' + datapoint
  }
  if (typeof value === 'object') {
    value = value['explicitDouble']
  }
  this.log.debug('RPC Set %s (%s)', adrchannel, value)
  this.homebridge.setCCUDummyValue(adrchannel, value)
}

HomeMaticRPCTestDriver.prototype.connect = function () {

}

HomeMaticRPCTestDriver.prototype.ccuWatchDog = function () {

}

HomeMaticRPCTestDriver.prototype.stop = function () {

}

HomeMaticRPCTestDriver.prototype.event = function (params, callback) {
  let that = this
  this.log.debug('rpc <- event on %s', this.interface)
  this.lastMessage = Math.floor((new Date()).getTime() / 1000)
  var channel = this.interface + params[1]
  var datapoint = params[2]
  var value = params[3]

  if (typeof value === 'object') {
    value = value['explicitDouble']
  }
  let adr = new HomeMaticAddress(channel + '.' + datapoint)
  if (adr.isValid()) {
    this.log.debug('RPC Event %s (%s)', adr.address(), value)
    this.platform.cache.doCache(adr.address(), value)
    this.homebridge.setCCUDummyValue(adr.address(), value)

    this.log.debug('Ok here is the Event' + JSON.stringify(params))
    this.log.debug('RPC single event for %s.%s with value %s', channel, datapoint, value)

    this.platform.getHomeMaticAppliances().map(function (accessory) {
      if ((accessory.address === channel) || ((accessory.caddress !== undefined) && (accessory.caddress === channel))) {
        that.log.debug('found accessory %s', accessory.address)
        accessory.event(adr, value)
      }
    })

    this.platform.fireEvent(adr.intf, adr.serial, adr.channelId, adr.dpName, value)
  }
  if (callback !== undefined) {
    callback(null, [])
  }
}

HomeMaticRPCTestDriver.prototype.multicall = function (events, callback) {
  this.log.debug('rpc <- system.multicall on %s', this.interface)
  let that = this
  let params = []
  params.map(function (events) {
    try {
      events.map(function (event) {
        if ((event['methodName'] === 'event') && (event['params'] !== undefined)) {
          var params = event['params']
          var channel = that.interface + params[1]
          var datapoint = params[2]
          var value = params[3]
          let address = that.interface + params[1] + '.' + params[2]
          let all = address + '.' + datapoint
          that.log.debug('RPC event for %s %s with value %s', channel, datapoint, value)

          that.platform.getHomeMaticAppliances().map(function (accessory) {
            var deviceaddress = channel.slice(0, channel.indexOf(':'))
            if (accessory.address === channel) {
              that.log.debug('[RPC] Accessory (%s) found by channeladdress (%s) -> Send Event with value %s', accessory.name, channel, value)
              accessory.event(all, value)
            } else

            if ((accessory.caddress !== undefined) && (accessory.caddress === channel)) {
              that.log.debug('[RPC] Accessory (%s) found by accessory.caddress %s matches channel %s -> Send Event with value %s', accessory.name, accessory.caddress, channel, value)
              accessory.event(all, value)
            } else

            if ((accessory.deviceaddress !== undefined) && (accessory.deviceaddress === deviceaddress) && (accessory.isMultiChannel === true)) {
              that.log.debug('[RPC] Accessory (%s) found -> by deviceaddress %s matches %s Send Event with value %s', accessory.name, accessory.deviceaddress, deviceaddress, value)
              accessory.event(all, value)
            }
          })

          that.platform.eventaddresses.map(function (tuple) {
            if (address === tuple.address) {
              tuple.accessory.event(all, value, tuple.function)
            }
          })
        }
      })
    } catch (err) { }
  })

  if (callback !== undefined) {
    callback(null, [])
  }
}

HomeMaticRPCTestDriver.prototype.isPortTaken = function (port, fn) {
  return false
}

module.exports = {
  HomeMaticRPCTestDriver: HomeMaticRPCTestDriver
}
