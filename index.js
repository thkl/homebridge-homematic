
const HomeMaticServiceClassLoader = require('./HomeMaticServiceClassLoader.js').HomeMaticServiceClassLoader
const HomeMaticCacheManager = require('./HomeMaticCacheManager.js').HomeMaticCacheManager
const HomeMaticCCU = require('./HomeMaticCCU.js').HomeMaticCCU
const childProcess = require('child_process')
const path = require('path')
const fs = require('fs')

const PLUGIN_NAME = 'homebridge-homematic'
const PLATFORM_NAME = 'HomeMatic'
const SCHEMA_VERSION = 1
var isInTest = typeof global.it === 'function'

let UUID

module.exports = homebridge => {
  homebridge.registerPlatform(PLUGIN_NAME, PLATFORM_NAME,
    HomeMaticPlatform, true)
}

class HomeMaticPlatform {
  constructor (log, config, homebridge) {
    this.log = log
    this.config = config

    this.homebridge = homebridge
    this.accessories = {}

    // Wait for Homebridge to restore cached accessories
    this.homebridge.on('didFinishLaunching',
      () => this.finishedLaunching())
  }

  configureAccessory (accessory) {
    accessory.reachable = false
    this.accessories[accessory.UUID] = accessory
  }

  invalidateAccessories () {
    Object.keys(this.accessories).forEach(key => {
      let accessory = this.accessories[key]
      if (accessory) {
        accessory.appliance = undefined
      }
    })
  }

  shutDownAppliances () {
    if (this.hmAppliances) {
      this.hmAppliances.map(appliance => {
        appliance.shutdown()
      })
    }
    this.hmAppliances = []
  }

  finishedLaunching () {
    let self = this
    if (this.config) {
      this.pluginConfig = this.config
      this.log.info('[Core] init HomeMatic Platform')
      this.localCache = path.join(this.homebridge.user.storagePath(), 'ccu.json')
      this.localPath = this.homebridge.user.storagePath()
      this.localHomematicConfig = path.join(this.localPath, 'homematic_config.json')
      this.ccuIP = this.config.ccu_ip
      this.cache = new HomeMaticCacheManager(this.log)
      if (this.homebridge) {
        this.api = this.homebridge
        if (this.homebridge.version < 2.1) {
          throw new Error('Unexpected API version.')
        }
      }

      // Shortcuts to useful HAP objects
      UUID = this.homebridge.hap.uuid

      if (isInTest) {
        this.setupHomeMaticManager()
        // build a shortcut for tests
        this.xmlrpc = this.homematicCCU.xmlrpc
      } else {
        this.mergeConfig()
        this.migrateConfig()

        this.staticSchema = path.join(__dirname, '../config.schema.json')
        this.dynamicSchema = path.join(this.localPath, '.' + PLUGIN_NAME + '-v' +
          SCHEMA_VERSION + '.schema.json')

        this.buildDynamicSchema()

        this.log.info('Homematic Plugin Version ' + this.getVersion())
        this.log.info('Plugin by thkl  https://github.com/thkl')
        this.log.info('Homematic is a registered trademark of the EQ-3 AG')
        this.log.info('Please report any issues to https://github.com/thkl/homebridge-homematic/issues')
        this.log.info('running in production mode')
        this.log.info('will connect to your ccu at %s', this.ccuIP)
        this.log.warn('IMPORTANT !! Starting this version, your homematic custom configuration is located in %s', this.localHomematicConfig)

        this.launchUIConfigurationServer()

        this.setupHomeMaticManager()

        process.on('SIGINT', () => {
          self.homematicCCU.shutDown()
        })

        process.on('SIGTERM', () => {
          self.homematicCCU.shutDown()
        })
      }
    }
  }

  loadConfigurationItems () {
    this.log.debug('[Core] loading configuration')
    // ** deprecate this **/
    this.filter_device = this.config.filter_device
    this.filter_channel = this.config.filter_channel

    // ** deprecate this in a future version by device settings
    // Migration Concept !
    this.outlets = this.config.outlets
    this.iosworkaround = this.config.ios10
    this.doors = this.config.doors
    this.windows = this.config.windows
    this.valves = this.config.valves

    this.variables = this.config.variables
    this.serviceVariables = []
    this.specialdevices = this.config.special
    this.programs = this.config.programs
    this.subsection = this.config.subsection
    this.vuc = this.config.variable_update_trigger_channel
  }

  setupHomeMaticManager () {
    let self = this
    this.homematicCCU = new HomeMaticCCU(this, isInTest)
    this.homematicCCU.reloadConfig()
    this.homematicCCU.pingCCU(data => {
      if (!isInTest) {
        self.log.info('[Core] if %s is PONG CCU is alive', data)
      } else {

      }
    })

    this.loadConfigurationItems()

    if ((this.subsection === undefined) || (this.subsection === '')) {
      this.log.warn('Uuhhh. There is no value for the key subsection in config.json.')
      this.log.warn('There will be no devices fetched from your ccu.')
      this.log.warn('Please create a subsection and put in all the channels,')
      this.log.warn('you want to import into homekit. Then add the name of self')
      this.log.warn('section into your config.json as "subsection"="....".')
      return
    }

    this.homematicCCU.setSubsection(this.subsection)
    this.buildAccessories()
  }

  addServiceVariable (varName) {
    let self = this
    if (this.serviceVariables.indexOf(varName) === -1) {
      this.log.debug('[Core] adding variable %s to global varupdater', varName)
      this.serviceVariables.push(varName)
      // loop thru all appliances and try to find the VARIABLE_UPDATE_TRIGGER
      if (this.hmAppliances) {
        this.hmAppliances.map(appliance => {
          if (appliance.type === 'VARIABLE_UPDATE_TRIGGER') {
            let vtc = self.variables
            vtc = vtc.concat(self.serviceVariables)
            self.log.debug('[Core] global variable updater found updating variable list to %s', JSON.stringify(vtc))
            appliance.special = vtc
          }
        })
      }
    } else {
      this.log.debug('[Core] varupdater haz %s yet', varName)
    }
  }

  async buildAccessories (changedAppliance) {
    let self = this
    this.shutDownAppliances()
    this.invalidateAccessories()
    this.homematicCCU.prepareForReload()

    this.log.debug('[Core] Fetching Homematic devices...')
    const internalconfig = this.internalConfig()
    const serviceclassLoader = new HomeMaticServiceClassLoader(this.log)
    serviceclassLoader.localPath = this.localPath
    serviceclassLoader.init(this.config.services)

    var json
    if (isInTest) {
      try {
        json = JSON.parse(this.config.testdata)
      } catch (e) {
        json = {}
      }
      this.updateAccesories(json, internalconfig, serviceclassLoader, changedAppliance)
    } else {
      this.log.debug('[Core] Local cache is set to %s', this.localCache)
      await this.homematicCCU.fetchInterfaces()
      let data = await this.homematicCCU.fetchDevices()

      if (data !== undefined) {
        json = JSON.parse(data)
      }
      if ((json === undefined) && (self.localCache !== undefined)) {
        json = this.homematicCCU.loadCachedDevices()
      }
      this.log.info('[Core] Publishing Accessories')
      this.updateAccesories(json, internalconfig, serviceclassLoader, changedAppliance)
      this.log.info('[Core] %s accessories published', Object.keys(this.accessories).length)

      this.homematicCCU.setupRPC()
    }
  }

  /* TODO CLEAN UP THIS MESS */

  updateAccesories (homematicObjects, internalconfig, serviceclassLoader, changedAppliance) {
    this.log.debug('[Core] updateAccesories changed : %s', changedAppliance)
    this.log.debug('[Core] subsection entries : %s', homematicObjects.subsection)
    this.newAccessories = []
    let Service = this.homebridge.hap.Service
    let Characteristic = this.homebridge.hap.Characteristic
    var accessoriesToRemove = []
    let self = this
    if ((homematicObjects !== undefined) && (homematicObjects.subsection !== undefined) && (homematicObjects.devices !== undefined)) {
      homematicObjects.devices.map(device => {
        const cfg = self.deviceInfo(internalconfig, device.type)
        if (device.channels !== undefined) {
          device.channels.map(ch => {
            if ((ch.address !== undefined) && (homematicObjects.subsection.indexOf(ch.cId) > -1)) {
              self.log.debug('[Core] processing %s', ch.address)

              // Switch found
              // Check if marked as Outlet or Door
              let special // just here for historic reasons
              if ((self.outlets !== undefined) && (self.outlets.indexOf(ch.address) > -1)) {
                self.log.warn('[DEPRECATED] the use of the config.json OUTLET key is deprecated. please setup %s via webconfig', ch.address)
              }
              if ((self.doors !== undefined) && (self.doors.indexOf(ch.address) > -1)) {
                self.log.warn('[DEPRECATED] the use of the config.json DOORS key is deprecated. please setup %s via webconfig', ch.address)
              }
              if ((self.windows !== undefined) && (self.windows.indexOf(ch.address) > -1)) {
                self.log.warn('[DEPRECATED] the use of the config.json WINDOW key is deprecated. please setup %s via webconfig', ch.address)
              }

              if ((self.valves !== undefined) && (self.valves.indexOf(ch.address) > -1)) {
                self.log.warn('[DEPRECATED] the use of the config.json VALVE key is deprecated. please setup %s via webconfig', ch.address)
              }

              // Build Interface for channel
              let oInterface = self.homematicCCU.intefaceWithId(ch.intfId)
              if (oInterface) {
                ch.intf = oInterface.name
                oInterface.inUse = true
                ch.address = oInterface.name + '.' + ch.address
                self.log.debug('[Core] updating channel address to %s', ch.address)
              }

              // let uuid = UUID.generate(ch.address)
              let name = ch.name.replace(/[.:#_()-]/g, ' ')
              let uuid = UUID.generate(self.config.name + ':' + name)
              self.log.debug('UUID for %s is %s', ch.address, uuid)
              var hkAccessory = self.accessories[uuid]

              // if the appliance was changed remove the old accessory
              self.log.debug('[core] check %s vs %s', ch.address, changedAppliance)
              if ((hkAccessory) && (changedAppliance === ch.address)) {
                self.log.debug('[Core] remove old accessory')
                self.homebridge.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [hkAccessory])
                self.accessories[uuid] = undefined
                hkAccessory = undefined
              }

              if (!hkAccessory) {
                self.log.debug('[Core] Build a new Accessory with name %s', name)
                hkAccessory = new this.homebridge.platformAccessory(name, uuid)
                self.log.debug('[Core] add new accessory %s', ch.address)
                self.newAccessories.push(hkAccessory)
              } else {
                self.log.debug('[Core] We will recycle accessory %s', hkAccessory.displayName)
              }

              // Check if VIRTUAL KEY is Set as Variable Trigger
              if ((self.vuc !== undefined) && (ch.type === 'VIRTUAL_KEY') && (ch.name === self.vuc)) {
                self.log.debug('Channel ' + self.vuc + ' added as Variable Update Trigger')
                ch.type = 'VARIABLE_UPDATE_TRIGGER'
                let vtc = self.variables
                vtc = vtc.concat(self.serviceVariables)
                serviceclassLoader.loadChannelService(hkAccessory, 'VARIABLE_UPDATE_TRIGGER', ch, self, vtc, cfg, 255, Service, Characteristic)
                hkAccessory.reachable = true
              } else {
                serviceclassLoader.loadChannelService(hkAccessory, device.type, ch, self, special, cfg, ch.access, Service, Characteristic)
                hkAccessory.reachable = true
              }

              if (hkAccessory.appliance) {
                self.hmAppliances.push(hkAccessory.appliance)
              }
            } else {
              // Channel is in the filter
            }
          })
        } else {
          self.log.debug('[Core] %s has no channels or is filtered', device.name)
        }
      })
    } else {
      self.log.warn('[Core] ccu returned no devices')
    }
    // End Mapping all JSON Data
    if (self.programs !== undefined) {
      self.log.debug('[Core] %s programs to add', self.programs.length)

      var ch = {}
      var cfg = {}
      var hkAccessory
      self.programs.map(program => {
        if (self.iosworkaround === undefined) {
          self.log.debug('[Core] Program ' + program + ' added as Program_Launcher')
          ch.type = 'PROGRAM_LAUNCHER'
          ch.address = program
          ch.name = program
          let name = ch.name.replace(/[.:#_()-]/g, ' ')
          let uuid = UUID.generate(self.config.name + ':' + name)
          // let uuid = UUID.generate(ch.address)
          hkAccessory = this.accessories[uuid]
          if (!hkAccessory) {
            let name = ch.name.replace(/[.:#_()-]/g, ' ')
            self.log.debug('[Core] Build a new Accessory with name %s', name)
            hkAccessory = new this.homebridge.platformAccessory(name, uuid)
            self.newAccessories.push(hkAccessory)
            self.log.debug('[Core] add new accessory %s', ch.address)
          } else {
            self.log.debug('[Core] We will recycle accessory %s', hkAccessory.displayName)
          }

          serviceclassLoader.loadChannelService(hkAccessory, 'PROGRAM_LAUNCHER', ch, self, 'PROGRAM', cfg, 255, Service, Characteristic)
          hkAccessory.reachable = true
        } else {
          cfg = self.deviceInfo(internalconfig, '')
          self.log.debug('[Core] Program ' + program + ' added as SWITCH cause of IOS 10')
          ch.type = 'SWITCH'
          ch.address = program
          ch.name = program
          let name = ch.name.replace(/[.:#_()-]/g, ' ')
          let uuid = UUID.generate(self.config.name + ':' + name)

          hkAccessory = this.accessories[uuid]
          if (!hkAccessory) {
            hkAccessory = new this.homebridge.platformAccessory(name, uuid)
            self.newAccessories.push(hkAccessory)
            self.log.debug('[Core] add new accessory %s', ch.address)
          }
          serviceclassLoader.loadChannelService(hkAccessory, 'SWITCH', ch, self, 'PROGRAM', cfg, 255, Service, Characteristic)
          hkAccessory.reachable = true
        }
      })
    } // End Mapping Programs

    if (self.specialdevices !== undefined) {
      self.specialdevices.map(specialdevice => {
        let name = specialdevice.name
        let type = specialdevice.type

        if (name !== undefined) {
          let uuid = UUID.generate(self.config.name + ':' + name)
          hkAccessory = this.accessories[uuid]
          if (!hkAccessory) {
            self.log.debug('[Core] special found %s added as %s', name, type)
            hkAccessory = new this.homebridge.platformAccessory(name, uuid)
            self.newAccessories.push(hkAccessory)
            self.log.debug('[Core] add new accessory %s', name)
          }

          var ch = {}
          ch.type = type
          ch.address = name
          ch.name = name
          serviceclassLoader.loadChannelService(hkAccessory, ch.type, ch, self, '', {}, 255, Service, Characteristic)
          hkAccessory.reachable = true

          if (hkAccessory.appliance) {
            hkAccessory.appliance.customService = true
            self.hmAppliances.push(hkAccessory.appliance)
          }
        }
      })
    }

    // Add Optional Variables
    if (self.variables !== undefined) {
      self.variables.map(variable => {
        const ch = {}
        const cfg = {}

        let name = variable.replace(/[.:#_()-]/g, ' ')
        let uuid = UUID.generate(self.config.name + ':' + name)
        hkAccessory = this.accessories[uuid]
        if (!hkAccessory) {
          self.log.debug('[Core] variable found %s added.', variable)
          hkAccessory = new this.homebridge.platformAccessory(variable, uuid)
          self.newAccessories.push(hkAccessory)
        }

        ch.type = 'VARIABLE'
        ch.address = variable
        ch.name = variable
        ch.intf = 'Variable'
        serviceclassLoader.loadChannelService(hkAccessory, 'VARIABLE', ch, self, 'VARIABLE', cfg, 255, Service, Characteristic)
        hkAccessory.reachable = true
      })
    }

    this.log.debug('[Core] New Accessories %s', this.newAccessories.length)
    this.homebridge.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, this.newAccessories)

    // remove deleted accessories
    Object.keys(this.accessories).forEach(key => {
      let ac = self.accessories[key]
      if ((ac) && (ac.appliance === undefined)) {
        self.log.warn('[Core] unable to find an applicance for %s. Remove it', ac.displayName)
        accessoriesToRemove.push(ac)
        self.accessories[key] = undefined // kill the accessory from the list
      }
    })

    // add new accessories to chached list
    this.newAccessories.forEach(accessory => {
      self.accessories[accessory.UUID] = accessory
    })

    this.log.debug('[Core] Accessories to remove %s', accessoriesToRemove.length)
    this.homebridge.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRemove)

    this.publishAccessoriesToConfigurationServer()
  }

  registeraddressForEventProcessingAtAccessory (address, accessory, aFunction) {
    if ((typeof address === 'object') && (address.isValid())) {
      this.homematicCCU.registeraddressForEventProcessingAtAccessory(address, accessory, aFunction)
      accessory.addHomeMaticDatapoint(address)
    }
  }

  fireEvent (intf, address, channel, datapoint, value) {
    this.homematicCCU.fireEvent(intf, address, channel, datapoint, value)
  }

  getHomeMaticAppliances () {
    return this.hmAppliances
  }

  buildDynamicSchema () {
    // Load the static schema
    if (fs.existsSync(this.staticSchema)) {
      let data = fs.readFileSync(this.staticSchema).toString()
      let schemaData = JSON.parse(data)
      // switch {myhost} in footerDisplay to the real url
      var footerDisplay = schemaData.footerDisplay
      schemaData.footerDisplay = footerDisplay.replace('{myhost}', this.getIPAddress())
      fs.writeFileSync(this.dynamicSchema, JSON.stringify(schemaData, null, 2))
    }
  }

  getIPAddress () {
    var interfaces = require('os').networkInterfaces()
    for (var devName in interfaces) {
      var iface = interfaces[devName]
      for (var i = 0; i < iface.length; i++) {
        var alias = iface[i]
        if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
          return alias.address
        }
      }
    }
    return '0.0.0.0'
  }

  launchUIConfigurationServer () {
    let self = this
    process.env.UIX_CONFIG_PATH = this.homebridge.user.configPath()
    process.env.UIX_STORAGE_PATH = this.homebridge.user.storagePath()
    process.env.UIX_PLUGIN_NAME = this.config.name || PLUGIN_NAME
    this.configUI = childProcess.fork(path.resolve(__dirname, 'PluginConfigurationService'), null, {
      env: process.env
    })
    this.log.info('Spawning homebridge-homematic configuration service with PID', this.configUI.pid)

    this.configUI.on('message', (message) => {
      self.handleIncommingIPCMessage(message)
    })
  }

  handleIncommingIPCMessage (message) {
    if ((message) && (message.topic)) {
      switch (message.topic) {
        case 'reloadApplicances':
          this.mergeConfig()
          this.loadConfigurationItems()
          this.buildAccessories(message.changed)
          // send new Data to the configurator
          this.publishAccessoriesToConfigurationServer()
          break
        case 'reconnectCCU':
          this.homematicCCU.reloadConfig()
          break
        default:
          break
      }
    }
  }

  publishAccessoriesToConfigurationServer () {
    let self = this
    if (this.configUI) {
      var accessoriesToConfig = []
      if (this.getHomeMaticAppliances().length > 0) {
        this.getHomeMaticAppliances().map(appliance => {
          if (appliance) {
            accessoriesToConfig.push({
              name: appliance.name,
              address: appliance.address,
              service: appliance.serviceClassName,
              config: appliance.cfg,
              devicetype: appliance.deviceType,
              channeltype: appliance.type,
              custom: appliance.customService
            })
          } else {
            self.log.warn('[Core] empty appliance found')
          }
        })
      } else {
        this.log.warn('[core] no appliances')
      }

      this.configUI.send({
        topic: 'configuration',
        configuration: self.config
      })

      this.configUI.send({
        topic: 'accessories',
        accessories: accessoriesToConfig
      })

      // Publish programms
      this.configUI.send({
        topic: 'programs',
        programs: self.programs
      })

      this.configUI.send({
        topic: 'variables',
        variables: self.variables
      })
    }
  }

  /* merges my own config from file into global plugin config */
  mergeConfig (callback) {
    let self = this
    if (fs.existsSync(this.localHomematicConfig)) {
      // use the stored plugin config and add the homematic_config.json stuff
      self.config = self.pluginConfig
      let data = fs.readFileSync(this.localHomematicConfig).toString()
      let myConfig = JSON.parse(data)
      this.log.info('[Core] merging configurations')
      Object.keys(myConfig).forEach(key => {
        self.config[key] = myConfig[key]
      })
    }
  }

  /* Save my Config once to a separate file */
  migrateConfig () {
    if (!fs.existsSync(this.localHomematicConfig)) {
      let self = this
      let keysNotToCopy = ['platform', 'name', 'ccu_ip', 'subsection']
      let myConfig = {}
      Object.keys(this.config).forEach(key => {
        if (keysNotToCopy.indexOf(key) === -1) {
          myConfig[key] = self.config[key]
        }
      })
      this.log.info('[Core] Migrate configuration once to %s ...', this.localHomematicConfig)
      fs.writeFileSync(this.localHomematicConfig, JSON.stringify(myConfig, null, 2))
    }
  }

  deviceInfo (config, devicetype) {
    let cfg
    if (config !== undefined) {
      const di = config.deviceinfo
      di.map(device => {
        if (device.type === devicetype) {
          cfg = device
        }
      })
    }

    return cfg
  }

  getVersion () {
    const pjPath = path.join(__dirname, './package.json')
    const pj = JSON.parse(fs.readFileSync(pjPath))
    return pj.version
  }

  internalConfig () {
    try {
      const configPath = path.join(__dirname, './internalconfig.json')
      const config = JSON.parse(fs.readFileSync(configPath))
      return config
    } catch (err) {
      throw err
    }
  }
}
