'use strict'

const xmlrpc = require('homematic-xmlrpc')
// const request = require('request')
// const debug = require('debug')('HomeMaticRPC')
const semver = require('semver')

var HomeMaticRPC = function (log, ccuip, port, system, platform) {
  this.log = log

  this.system = system
  this.ccuip = ccuip
  this.platform = platform
  this.server = undefined
  this.client = undefined
  this.stopping = false
  this.localIP = undefined
  this.listeningPort = port
  this.lastMessage = 0
  this.watchDogTimer = undefined
  this.rpc = undefined
  this.rpcInit = undefined
  this.pathname = '/'
  this.watchDogTimeout = 0

  if (platform.config['watchdog'] !== undefined) {
    this.watchDogTimeout = platform.config['watchdog']
  }

  if (semver.lt(process.version, '4.5.0')) {
    this.log.warn('you are running an outdated node version. for now it may work but please update.')
  }

  switch (system) {
    case 0 :
      this.interface = 'BidCos-RF.'
      this.ccuport = 2001

    this.log.info('using xmprpc for communication with BidCos-RF')
    this.rpc = xmlrpc;
    this.rpcInit = 'http://';
    break;

    case 1 :
    this.interface = 'BidCos-Wired.';
    this.rpc = xmlrpc;
    this.rpcInit = 'http://';
    this.ccuport = 2000;
    break;


    case 2 :
      this.interface = 'HmIP-RF.'
      this.rpc = xmlrpc
      this.ccuport = 2010
      this.rpcInit = 'http://'
      break

    case 3 :
      this.interface = 'VirtualDevices.'
      this.rpc = xmlrpc
      this.ccuport = 9292
      this.pathname = '/groups'
      this.rpcInit = 'http://'
      break
  }

  this.log.info('init RPC for %s', this.interface)
}

HomeMaticRPC.prototype.init = function () {
  var that = this

  var ip = this.platform.config.local_ip
  if (ip === undefined) {
    ip = this.getIPAddress()
    if (ip === '0.0.0.0') {
      that.log('Can not fetch IP')
      return
    }
  }

  this.localIP = ip

  this.log.info('local ip used : %s. you may change that with local_ip parameter in config', ip)

  this.isPortTaken(this.listeningPort, function (error, inUse) {
    if (error === null) {
      if (inUse === false) {
        that.server = that.rpc.createServer({
          host: that.localIP,
          port: that.listeningPort
        })

        that.server.on('NotFound', function (method, params) {
        // that.log.debug("Method %s does not exist. - %s",method, JSON.stringify(params));
        })

        that.server.on('system.listMethods', function (err, params, callback) {
          that.log.debug("Method call params for 'system.listMethods': %s (%s)", JSON.stringify(params), err)
          callback(null, ['event', 'system.listMethods', 'system.multicall'])
        })

        that.server.on('listDevices', function (err, params, callback) {
          that.log.debug('rpc <- listDevices on %s - Zero Reply (%s)', that.interface, err)
          callback(null, [])
        })

        that.server.on('newDevices', function (err, params, callback) {
          that.log.debug('rpc <- newDevices on %s nobody is interested in newdevices ... (%s)', that.interface, err)
          // we are not intrested in new devices cause we will fetch them at launch
          callback(null, [])
        })

        that.server.on('event', function (err, params, callback) {
          that.log.debug('rpc <- event  on %s (%s)', that.interface, err)
          that.lastMessage = Math.floor((new Date()).getTime() / 1000)
          var channel = that.interface + params[1]
          var datapoint = params[2]
          var value = params[3]
          let address = that.interface + params[1] + '.' + params[2]

          that.log.debug('RPC single event for %s %s with value %s', channel, datapoint, value)

          that.platform.foundAccessories.map(function (accessory) {
            if ((accessory.adress === channel) || ((accessory.cadress !== undefined) && (accessory.cadress === channel))) {
              that.log.debug('found accessory %s', accessory.adress)
              accessory.event(channel, datapoint, value)
            }
          })

          that.platform.eventAdresses.map(function (tuple) {
            if (address === tuple.address) {
              that.log.debug('found accessory %s run registred event', tuple.address)
              tuple.accessory.event(channel, datapoint, value, tuple.function)
            }
          })

          callback(null, [])
        })

        that.server.on('system.multicall', function (err, params, callback) {
          that.log.debug('rpc <- system.multicall on %s (%s)', that.interface, err)
          that.lastMessage = Math.floor((new Date()).getTime() / 1000)

          params.map(function (events) {
            try {
              events.map(function (event) {
                if ((event['methodName'] === 'event') && (event['params'] !== undefined)) {
                  var params = event['params']
                  var channel = that.interface + params[1]
                  var datapoint = params[2]
                  var value = params[3]
                  let address = that.interface + params[1] + '.' + params[2]

                  that.log.debug('RPC event for %s %s with value %s', channel, datapoint, value)

                  that.platform.foundAccessories.map(function (accessory) {
                    var deviceAdress = channel.slice(0, channel.indexOf(':'))

                    if ((accessory.adress === channel) ||
                  ((accessory.cadress !== undefined) && (accessory.cadress === channel)) ||
                  ((accessory.deviceAdress !== undefined) && (accessory.deviceAdress === deviceAdress))) {
                      that.log.debug('Accessory %s found -> Send Event', accessory.name)
                      accessory.event(channel, datapoint, value)
                    }
                  })

                  that.platform.eventAdresses.map(function (tuple) {
                    if (address === tuple.address) {
                      tuple.accessory.event(channel, datapoint, value, tuple.function)
                    }
                  })
                }
              })
            } catch (err) {}
          })
          callback(null)
        })

        that.log.info('RPC server for interface %s is listening on port %s.', that.interface, that.listeningPort)
        that.connect()
      } else {
        that.log.error('****************************************************************************************************************************')
        that.log.error('*  Sorry the local port %s on your system is in use. Please make sure, that no other instance of this plugin is running.', that.listeningPort)
        that.log.error('*  you may change the initial port with the config setting for local_port in your config.json ')
        that.log.error('*  giving up ... the homematic plugin is not able to listen for ccu events on %s until you fix this. ', that.interface)
        that.log.error('****************************************************************************************************************************')
      }
    } else {
      that.log.error('*  Error while checking ports')
    }
  })
}

HomeMaticRPC.prototype.getIPAddress = function () {
  var interfaces = require('os').networkInterfaces()
  for (var devName in interfaces) {
    var iface = interfaces[devName]
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i]
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal && (alias.address.indexOf('169.254.') === -1)) { return alias.address }
    }
  }
  return '0.0.0.0'
}

HomeMaticRPC.prototype.getValue = function (channel, datapoint, callback) {
  var that = this
  if (this.client === undefined) {
    this.log.debug('Returning cause client is invalid')
    return
  }
  if (channel.indexOf(that.interface) > -1) {
    channel = channel.substr(that.interface.length)

    this.log.debug('RPC getValue Call for %s %s', channel, datapoint)
    this.client.methodCall('getValue', [channel, datapoint], function (error, value) {
      that.log.debug('RPC getValue (%s %s) Response %s  | Errors: %s', channel, datapoint, JSON.stringify(value), error)
      callback(value)
    })
  } else {
  }
}

HomeMaticRPC.prototype.setValue = function (channel, datapoint, value, callback) {
  var that = this
  this.log.debug('XMLRpc setValue %s %s %s', channel, datapoint, value)
  if (this.client === undefined) {
    this.log.error('client missing')
    return
  }

  if (channel.indexOf(that.interface) > -1) {
    channel = channel.substr(that.interface.length)
  }

  // if (that.interface != "HmIP-RF.") {
  //  value = String(value);
  // }

  this.log.debug('RPC setValue Call for %s %s Value %s Type %s', channel, datapoint, value, typeof value)

  this.client.methodCall('setValue', [channel, datapoint, value], function (error, value) {
    that.log.debug('RPC setValue (%s %s) Response %s Errors: %s', channel, datapoint, JSON.stringify(value), error)
    if ((value !== undefined) && (value['faultCode'] !== undefined) && (callback !== undefined)) {
      callback(value['faultCode'], value)
    } else
    if (callback !== undefined) {
      callback(error, value)
    }
  })
}

HomeMaticRPC.prototype.connect = function () {
  var that = this
  this.lastMessage = Math.floor((new Date()).getTime() / 1000)
  var port = this.ccuport
  this.log.info('Creating Local HTTP Client for CCU RPC Events')
  this.client = that.rpc.createClient({
    host: this.ccuip,
    port: port,
    path: this.pathname,
    queueMaxLength: 100
  })
  this.log.debug('CCU RPC Init Call on port %s for interface %s', port, this.interface)
  var command = this.rpcInit + this.localIP + ':' + this.listeningPort
  this.client.methodCall('init', [command, 'homebridge_' + this.interface], function (error, value) {
    that.log.debug('CCU Response for init at %s with %s...Value (%s) Error : (%s)', that.interface, command, JSON.stringify(value), error)
    that.lastMessage = Math.floor((new Date()).getTime() / 1000)
  })

  if (this.watchDogTimeout > 0) {
    this.ccuWatchDog()
  }
}

HomeMaticRPC.prototype.ccuWatchDog = function () {
  var that = this

  if (this.lastMessage !== undefined) {
    var now = Math.floor((new Date()).getTime() / 1000)
    var timeDiff = now - this.lastMessage
    if (timeDiff > that.watchDogTimeout) {
      that.log.debug('Watchdog Trigger - Reinit Connection for %s after idle time of %s seconds', this.interface, timeDiff)
      that.lastMessage = now
      that.client.methodCall('init', [this.rpcInit + this.localIP + ':' + this.listeningPort, 'homebridge_' + this.interface], function (error, value) {
        that.log.debug('CCU Response ...Value (%s) Error : (%s)', JSON.stringify(value), error)
        that.lastMessage = Math.floor((new Date()).getTime() / 1000)
      })
    }
  }

  var recall = function () {
    that.ccuWatchDog()
  }

  this.watchDogTimer = setTimeout(recall, 10000)
}

HomeMaticRPC.prototype.stop = function() {
  this.log.info('Removing Event Server for Interface %s', this.interface);
  this.client.methodCall("init", [this.rpcInit + this.localIP + ':' + this.listeningPort], function(error, value) {
    if (error !== undefined) {
      this.log.error('Error while removing eventserver %s', error)
    }
  });
}

// checks if the port is in use
// https://gist.github.com/timoxley/1689041

HomeMaticRPC.prototype.isPortTaken = function (port, fn) {
  var net = require('net')
  var tester = net.createServer().once('error', function (err) {
    if (err.code !== 'EADDRINUSE') return fn(err)
    fn(null, true)
  })
    .once('listening', function () {
      tester.once('close', function () { fn(null, false) })
        .close()
    }).listen(port)
}

module.exports = {
  HomeMaticRPC: HomeMaticRPC
}
