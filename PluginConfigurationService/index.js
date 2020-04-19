const Logger = require('./logger.js').Logger
const logger = new Logger('HomeMatic Configuration Service')
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const url = require('url')
const qs = require('querystring')

process.title = 'homebridge-homemtic_config'

class PluginConfigurationService {
  constructor () {
    this.contentTypesByExtension = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.json': 'application/json; charset=utf-8',
      '.mp3': 'audio/mpeg',
      '.gif': 'image/gid',
      '.gz': 'application/gzip',
      '.ico': 'image/x-icon',
      '.woff2': 'font/opentype',
      '.woff': 'font/opentype',
      '.ttf': 'font/opentype',
      '.mp4': 'video/mp4'

    }
    this.programs = []
    this.variables = []
    this.pluginAccessories = []
    this.loadServiceTemplates()
  }

  shutdown () {
    if (this.server) {
      this.server.close()
    }
  }

  prepareAccessories (serverList) {
    let self = this
    this.pluginAccessories = []
    serverList.map(accessory => {
      if (accessory.custom === true) {
        accessory.services = self.getCustomServiceData(accessory.service)
      } else {
        accessory.services = self.settingsForType(accessory.devicetype, accessory.channeltype)
      }
      self.pluginAccessories.push(accessory)
    })
  }

  handleIncommingIPCMessage (message) {
    if (message.topic) {
      switch (message.topic) {
        case 'accessories':
          this.prepareAccessories(message.accessories)
          break

        case 'configuration':
          this.pluginConfig = message.configuration
          break

        case 'programs':
          this.programs = message.programs
          break

        case 'variables':
          this.variables = message.variables
          break

        default:
          break
      }
    }
  }

  getStartupConfig () {
    let self = this
    this.myConfig = {}

    this.configPath = process.env.UIX_CONFIG_PATH || path.resolve(os.homedir(), '.homebridge/config.json')

    return new Promise((resolve, reject) => {
      fs.readFile(self.configPath, function (error, data) {
        if (!error) {
          if (data) {
            let oHomebridgeConfig = JSON.parse(data.toString())
            if (oHomebridgeConfig) {
            // Loop thru platforms and find my one
              let platforms = oHomebridgeConfig.platforms || []
              platforms.map(platform => {
                if (platform.platform === 'HomeMatic') {
                  self.myConfig = platform
                }
              })
            } else {
              logger.warn('No Homebridge config found')
            }
          } else {
            logger.warn('cannot read homebridge config in %s (%s)', self.configPath, data)
          }
        } else {
          logger.error(error)
        }
        self.configServerPort = self.myConfig.ConfigServerPort || 8090
        resolve()
      })
    })
  }

  loadMyConfig () {
    let storagePath = process.env.UIX_STORAGE_PATH || path.resolve(os.homedir(), '.homebridge')
    let homeMaticConfigFile = path.join(storagePath, 'homematic_config.json')
    if (fs.existsSync(homeMaticConfigFile)) {
      let data = fs.readFileSync(homeMaticConfigFile)
      if (data) {
        return JSON.parse(data)
      }
    }
    return {}
  }

  saveMyConfig (newConfig) {
    let storagePath = process.env.UIX_STORAGE_PATH || path.resolve(os.homedir(), '.homebridge')
    let homeMaticConfigFile = path.join(storagePath, 'homematic_config.json')
    if (fs.existsSync(homeMaticConfigFile)) {
      fs.copyFileSync(homeMaticConfigFile, homeMaticConfigFile + '.' + Date.now())
    }
    fs.writeFileSync(homeMaticConfigFile, JSON.stringify(newConfig, null, 2))
  }

  sendFile (unsafeSuffix, response) {
    var safeSuffix = path.normalize(unsafeSuffix).replace(/^(\.\.(\/|\\|$))+/, '')
    var safeFilePath = path.join(__dirname, 'html', safeSuffix)

    if (safeFilePath.endsWith('/')) {
      safeFilePath = path.join(safeFilePath, 'index.html')
    }

    if (fs.existsSync(safeFilePath)) {
      let stat = fs.statSync(safeFilePath)
      let contentType = this.contentTypesByExtension[path.extname(safeFilePath)]

      response.writeHead(200, {
        'Content-Type': contentType || 'text/html',
        'Content-Length': stat.size
      })

      var readStream = fs.createReadStream(safeFilePath)
      readStream.pipe(response)
    } else {
      logger.warn('File not found %s', safeFilePath)
      response.writeHead(404, { 'Content-Type': 'text/plain' })
      response.end('ERROR File does not exist')
    }
  }

  sendJSON (object, response) {
    response.writeHead(200, {
      'Content-Type': 'application/json'
    })
    response.end(JSON.stringify(object))
  }

  pluginAccessoriesByAddress (adr) {
    var result
    this.pluginAccessories.map(accessory => {
      if (accessory.address === adr) {
        result = accessory
      }
    })
    return result
  }

  getSettings (adr) {

  }

  loadServiceClass (className) {
    if (fs.existsSync(path.join(__dirname, '..', 'ChannelServices', className + '.js'))) {
      logger.debug('[Config]  Load BuildIn Service Class %s', className)
      return require(path.join(__dirname, '..', 'ChannelServices', className))
    }

    if (fs.existsSync(path.join(this.configPath, className + '.js'))) {
      logger.debug('[Config]  Load Custom Service Class %s', className)
      return require(path.join(this.configPath, className))
    }

    logger.warn('[Config] No class found for %s', className)
    return undefined
  }

  saveSettings (strData) {
    if (strData) {
      let data = JSON.parse(strData)
      let service = data.service
      let config = data.config
      // remove the interface
      let rgx = /.([A-z0-9:]{6,})/
      let parts = rgx.exec(data.address)
      var address
      if (parts) {
        address = (parts.length > 1) ? parts[1] : data.address
      } else {
        address = data.address
      }
      var pluginHmConfig = this.loadMyConfig()
      // load the serviceclass and validate the configuration
      let ServiceClass = this.loadServiceClass(service)
      if (ServiceClass) {
        let serviceInstance = new ServiceClass(null, logger)
        var itemKeysToSave = serviceInstance.configItems()
        if (config) {
          let newServiceConfig = {
            'type': address,
            'service': service,
            'options': {}
          }
          // if (serviceInstance.validateConfig(config)) {
          // build the serviceconfig
          Object.keys(config).map(key => {
            if (itemKeysToSave.indexOf(key) > -1) {
              newServiceConfig.options[key] = config[key]
            }
          })

          // change the item in global config
          let myServices = pluginHmConfig.services
          if (myServices === undefined) {
            logger.debug('[Save Config] empty services create a new Array')
            myServices = []
          }
          // remove the old entry
          myServices = myServices.filter(service => {
            return (service.type !== address)
          })
          // add the new service config
          myServices.push(newServiceConfig)

          pluginHmConfig['services'] = myServices

          // Check if its a special sevice
          let serviceDev = this.serviceTemplates[service]
          if ((serviceDev) && (serviceDev.special)) {
            // load the special config setting
            let spList = pluginHmConfig['special']
            if (spList === undefined) {
              spList = []
            }
            var found = false
            spList.map(sv => {
              if (sv.name === address) {
                found = true
              }
            })
            if (found === false) {
              spList.push({ name: address })
            }
            pluginHmConfig['special'] = spList
          }

          this.saveMyConfig(pluginHmConfig)
          let message = {
            topic: 'reloadApplicances',
            changed: data.address
          }
          this.process.send(message)
          return true
          // } else {
          //  logger.warn('[Config] configuration for %s is invalid', service)
          // }
        }
      } else {
        logger.warn('Serviceclass not found')
      }
    }
    return false
  }

  saveNewVariable (newVariableName) {
    var pluginHmConfig = this.loadMyConfig()
    var variableList = pluginHmConfig['variables']
    if (variableList === undefined) {
      variableList = []
    }

    variableList.push(newVariableName)

    pluginHmConfig['variables'] = variableList

    this.saveMyConfig(pluginHmConfig)
    let message = {
      topic: 'reloadApplicances',
      changed: newVariableName
    }
    this.process.send(message)
    return true
  }

  saveNewProgram (newProgramName) {
    var pluginHmConfig = this.loadMyConfig()
    var programList = pluginHmConfig['programs']
    if (programList === undefined) {
      programList = []
    }
    programList.push(newProgramName)
    pluginHmConfig['programs'] = programList
    this.saveMyConfig(pluginHmConfig)
    let message = {
      topic: 'reloadApplicances',
      changed: newProgramName
    }
    this.process.send(message)
    return true
  }

  removeVariable (variableName) {
    var pluginHmConfig = this.loadMyConfig()
    var variableList = pluginHmConfig['variables']
    if (variableList === undefined) {
      variableList = []
    }
    logger.debug('List before %s', JSON.stringify(variableList))
    variableList = variableList.filter(item => {
      return (item !== variableName)
    })
    logger.debug('List after %s', JSON.stringify(variableList))

    pluginHmConfig['variables'] = variableList

    this.saveMyConfig(pluginHmConfig)
    let message = {
      topic: 'reloadApplicances',
      changed: variableName
    }
    this.process.send(message)
    return true
  }

  removeProgram (programName) {
    var pluginHmConfig = this.loadMyConfig()
    var programList = pluginHmConfig['programs']
    if (programList === undefined) {
      programList = []
    }

    programList = programList.filter(item => {
      return (item !== programName)
    })

    pluginHmConfig['programs'] = programList

    this.saveMyConfig(pluginHmConfig)
    let message = {
      topic: 'reloadApplicances',
      changed: programName
    }
    this.process.send(message)
    return true
  }

  processApiCall (query, response) {
    if (query.method) {
      switch (query.method) {
        case 'devicelist':
          this.sendJSON(this.pluginAccessories, response)
          break

        case 'programlist':
          this.sendJSON(this.programs, response)
          break

        case 'variablelist':
          this.sendJSON(this.variables, response)
          break

        case 'ccu':
          this.sendJSON((this.pluginConfig) ? this.pluginConfig : {}, response)
          break

        case 'getSettings':
          let adr = query.adr
          this.sendJSON(this.getSettings(adr), response)
          break

        case 'services':
          this.loadServiceTemplates()
          this.sendJSON(this.serviceTemplates, response)
          break

        case 'saveSettings':
          this.sendJSON(this.saveSettings(query.config), response)
          break

        case 'reloadApplicances':
          let message = {
            topic: 'reloadApplicances'
          }
          this.process.send(message)
          this.sendJSON({ 'result': true }, response)
          break

        case 'newVariable':
          this.sendJSON(this.saveNewVariable(query.name), response)
          break

        case 'newProgram':
          this.sendJSON(this.saveNewProgram(query.name), response)
          break

        case 'removeProgram':
          this.sendJSON(this.removeProgram(query.name), response)
          break

        case 'removeVariable':
          this.sendJSON(this.removeVariable(query.name), response)
          break

        default:
          break
      }
    }
  }

  loadServiceTemplates () {
    let template = path.join(__dirname, 'data.json')
    if (fs.existsSync(template)) {
      let dta = fs.readFileSync(template)
      if (dta) {
        this.serviceTemplates = JSON.parse(dta)
      }
    }
  }

  settingsForType (devicetype, channeltype) {
    var result = []
    Object.keys(this.serviceTemplates).map(serviceKey => {
      let serviceData = this.serviceTemplates[serviceKey]
      let channelTypes = serviceData['channelType']
      if ((channelTypes.indexOf(channeltype) !== -1) || (channelTypes.indexOf(devicetype + ':' + channeltype) !== -1)) {
        result.push({ service: serviceKey, configuration: serviceData.configuration })
      }
    })
    return result
  }

  getCustomServiceData (serviceClass) {
    var result = []
    Object.keys(this.serviceTemplates).map(serviceKey => {
      let serviceData = this.serviceTemplates[serviceKey]
      if (serviceKey === serviceClass) {
        result.push({ service: serviceKey, configuration: serviceData.configuration })
      }
    })
    return result
  }

  async run () {
    let self = this
    logger.info('[Config] Running Configuration Service')
    await this.getStartupConfig()
    if (this.myConfig.debug) {
      logger.info('[Config] Enable Debug Output')
      logger.setDebugEnabled(true)
    }
    function handleRequest (request, response) {
      if (request.method === 'POST') {
        var body = ''
        request.on('data', function (data) {
          body += data
          if (body.length > 1e6) {
            request.connection.destroy()
          }
        })

        request.on('end', function () {
          let parsed = url.parse(request.url, true)
          let post = qs.parse(body)
          let filename = parsed.pathname
          if (filename === '/api/') {
            self.processApiCall(post, response)
          } else {
            self.sendFile(filename, response)
          }
        })
      } else {
        let parsed = url.parse(request.url, true)
        let filename = parsed.pathname
        if (filename === '/api/') {
          self.processApiCall(parsed.query, response)
        } else {
          self.sendFile(filename, response)
        }
      }
    }

    this.server = http.createServer(handleRequest)
    this.server.listen(this.configServerPort, function () {
      logger.info('[Config] Running Configuration Server on Port %s', self.configServerPort)
    })
  }
}

let pcs = new PluginConfigurationService()
pcs.run()
pcs.process = process
setInterval(() => {
  if (!process.connected) {
    logger.info('[Config] Shutdown Configuration Service')
    pcs.shutdown()
    process.exit(1)
  }
}, 10000)

process.on('message', (message) => {
  pcs.handleIncommingIPCMessage(message)
})

process.on('disconnect', () => {
  logger.info('[Config] Shutdown Configuration Service')
  pcs.shutdown()
  process.exit()
})
