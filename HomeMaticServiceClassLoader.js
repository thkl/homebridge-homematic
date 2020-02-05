'use strict'
const path = require('path')
const fs = require('fs')

var HomeMaticServiceClassLoader = function (log) {
  this.log = log
}

HomeMaticServiceClassLoader.prototype.init = function (customServices) {
  this.config = this.internalConfig(customServices)
}

HomeMaticServiceClassLoader.prototype.findServiceClass = function (type) {
  if (type === undefined) {
    return undefined
  }
  let sv = this.getServiceClass(type)
  if (sv !== undefined) {
    // not found try to find channeltype
    var options
    let serviceclass = sv.class
    // check if there are options for specific type
    if (sv.options === undefined) {
      options = this.getOptions(type)
    } else {
      // if not use class dev options
      options = sv.options
    }
    return {
      class: serviceclass,
      options: options
    }
  } else {
    return undefined
  }
}

HomeMaticServiceClassLoader.prototype.loadChannelService = function (list, deviceType, channel, platform, special, cfg, access, Service, Characteristic) {
  var that = this
  var channelType = channel.type
  var log = platform.log
  var id = channel.id
  var name = channel.name
  var adress = channel.address
  // var intf = channel.intf
  this.platform = platform
  this.localPath = platform.localPath
  // try to load device:type
  var serviceclass
  var options
  var sv

  // first try the adress adress comes as Interface.Serial:Channel
  let arp = adress.split('.')
  if ((arp !== undefined) && (arp.length > 1)) {
    // if there is a Interface in front , just use the last part
    sv = this.findServiceClass(arp[1])
  } else {
    // should not be happend
    sv = this.findServiceClass(adress)
  }

  if (sv !== undefined) {
    serviceclass = sv.class
    options = sv.options
    this.log.debug('[ServiceClassLoader] Serviceclass %s found by adress %s', serviceclass, adress)
  }

  // then devicetype and channeltype
  if (serviceclass === undefined) {
    sv = this.findServiceClass(deviceType + ':' + channelType)
    if (sv !== undefined) {
      serviceclass = sv.class
      options = sv.options
      this.log.debug('[ServiceClassLoader] Serviceclass %s found by devtype:channeltype %s:%s', serviceclass, deviceType, channelType)
    }
  }

  // not found try to find channeltype
  if (serviceclass === undefined) {
    sv = this.findServiceClass(channelType)
    if (sv !== undefined) {
      serviceclass = sv.class
      options = sv.options
      this.log.debug('[ServiceClassLoader] Serviceclass %s found by channeltype %s', serviceclass, channelType)
    }
  }

  // not found try device
  if (serviceclass === undefined) {
    sv = this.findServiceClass(deviceType)
    if (sv !== undefined) {
      serviceclass = sv.class
      options = sv.options
      this.log.debug('[ServiceClassLoader] Serviceclass %s found by devtype %s', serviceclass, deviceType)
    }
  }

  // not found try the global configuration
  if (serviceclass !== undefined) {
    var HKitService = this.loadClass(serviceclass)
    if (HKitService) { // require ('./ChannelServices/' + serviceclass);
      // add Options
      if (options !== undefined) {
        if (cfg !== undefined) {
          cfg.push.apply(cfg, options)
        } else {
          cfg = options
        }
      }
      if (cfg === undefined) {
        cfg = {}
      }

      cfg['interface'] = channel.intf

      // Replace Chars in name https://github.com/thkl/homebridge-homematic/issues/56

      name = name.replace(/[.:#_()-]/g, ' ')
      that.log.debug('[ServiceClassLoader] Service for %s:%s is %s', deviceType, channelType, serviceclass)

      let cfgOptions = this.getConfigOptions(deviceType + ':' + channelType)
      if (cfgOptions !== undefined) {
        // Add config.json options
        Object.keys(cfgOptions).forEach(function (key) {
          cfg[key] = cfgOptions[key]
        })
      }

      var accessory = new HKitService(log, platform, id, name, channelType, adress, special, cfg, Service, Characteristic, deviceType)

      if (accessory.grantAccess === undefined) {
        accessory.setReadOnly((access !== '255'))
      }

      accessory.serviceClassName = serviceclass
      // Only add if there are more than 1 Service (number 1 is the informationService)
      // see https://github.com/thkl/homebridge-homematic/issues/234#issuecomment-375764819
      this.log.debug('[ServiceClassLoader] Number of Services in %s is %s', name, accessory.getServices().length)
      if (accessory.getServices().length > 1) {
        list.push(accessory)
      }
    }
  } else {
    that.log.warn('[ServiceClassLoader] There is no service for ' + deviceType + ':' + channelType)
  }
}

HomeMaticServiceClassLoader.prototype.loadClass = function (serviceclass) {
  if (fs.existsSync(path.join(__dirname, 'ChannelServices', serviceclass + '.js'))) {
    this.log.debug('[ServiceClassLoader] Load BuildIn Service Class %s', serviceclass)
    return require(path.join(__dirname, 'ChannelServices', serviceclass))
  }

  if (fs.existsSync(path.join(this.localPath, serviceclass + '.js'))) {
    this.log.debug('[ServiceClassLoader] Load Custom Service Class %s', serviceclass)
    return require(path.join(this.localPath, serviceclass))
  }

  this.log.warn('[ServiceClassLoader] No class found in %s or %s', path.join(__dirname, 'ChannelServices', serviceclass + '.js'), path.join(this.localPath, serviceclass + '.js'))

  return undefined
}

HomeMaticServiceClassLoader.prototype.getOptions = function (type) {
  var options
  if (this.config !== undefined) {
    var ci = this.config['channelconfig']
    ci.map(function (service) {
      if (service['type'] === type) {
        options = service['options']
      }
    })
  }

  return options
}

// load options from config.json

HomeMaticServiceClassLoader.prototype.getConfigOptions = function (type) {
  this.log.debug('[ServiceClassLoader] Check config for %s', type)
  var options
  let coptions = this.platform.config[type]
  if (coptions) {
    this.log.debug('[ServiceClassLoader] Additional config found')
    options = coptions
  } else {
    this.log.debug('[ServiceClassLoader] No additional config found for %s', type)
  }
  return options
}

HomeMaticServiceClassLoader.prototype.getServiceClass = function (type) {
  var serviceclass
  var serviceoptions

  if (this.config !== undefined) {
    var ci = this.config['channelconfig']
    ci.map(function (service) {
      if (service['type'] === type) {
        serviceclass = service['service']
        serviceoptions = service['options']
      }
    })
  }
  if (serviceclass !== undefined) {
    return {
      class: serviceclass,
      options: serviceoptions
    }
  } else {
    return undefined
  }
}

HomeMaticServiceClassLoader.prototype.internalConfig = function (customServices) {
  try {
    var configPath = path.join(__dirname, './ChannelServices/channel_config.json')
    var config = JSON.parse(fs.readFileSync(configPath))
    if (customServices !== undefined) {
      customServices.map(function (service) {
        config['channelconfig'].push(service)
      })
    }

    return config
  } catch (err) {
    this.log.warn('[ServiceClassLoader] Internal Channel config has errors, or was not found. You may ceck the file ChannelService/channel_config.json')
    throw err
  }
}

module.exports = {
  HomeMaticServiceClassLoader: HomeMaticServiceClassLoader
}
