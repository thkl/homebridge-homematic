const Logger = require('./logger.js').Logger
const logger = new Logger('HomeMatic Configuration Service')
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const url = require('url')

process.title = 'homebridge-homemtic_config'

var PluginConfigurationService = function () {
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
  this.loadServiceTemplates()
}

PluginConfigurationService.prototype.shutdown = function () {
  this.server.close()
}

PluginConfigurationService.prototype.prepareAccessories = function (serverList) {
  let that = this
  this.pluginAccessories = []
  serverList.map(accessory => {
    accessory.services = that.settingsForType(accessory.devicetype, accessory.channeltype)
    that.pluginAccessories.push(accessory)
  })
}

PluginConfigurationService.prototype.handleIncommingIPCMessage = function (message) {
  if (message.topic) {
    switch (message.topic) {
      case 'accessories':
        this.prepareAccessories(message.accessories)
        break
      case 'configuration':
        this.pluginConfig = message.configuration
        break
      default:
        break
    }
  }
}

PluginConfigurationService.prototype.getStartupConfig = function () {
  let that = this
  this.myConfig = {}

  const configPath = process.env.UIX_CONFIG_PATH || path.resolve(os.homedir(), '.homebridge/config.json')

  return new Promise((resolve, reject) => {
    const homebridgeConfig = fs.readFile(configPath, function (error, data) {
      if (!error) {
        if (homebridgeConfig) {
          let oHomebridgeConfig = JSON.parse(homebridgeConfig.toString())
          if (oHomebridgeConfig) {
            // Loop thru platforms and find my one
            let platforms = oHomebridgeConfig.platforms || []
            platforms.map(platform => {
              if (platform.platform === 'HomeMatic') {
                that.myConfig = platform
              }
            })
          }
        }
      }
      that.configServerPort = that.myConfig.ConfigServerPort || 8090
      resolve()
    })
  })
}

PluginConfigurationService.prototype.sendFile = function (unsafeSuffix, response) {
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

PluginConfigurationService.prototype.sendJSON = function (object, response) {
  response.writeHead(200, {
    'Content-Type': 'application/json'
  })
  response.end(JSON.stringify(object))
}

PluginConfigurationService.prototype.pluginAccessoriesByAddress = function (adr) {
  var result
  this.pluginAccessories.map(accessory => {
    if (accessory.address === adr) {
      result = accessory
    }
  })
  return result
}

PluginConfigurationService.prototype.getSettings = function (adr) {

}

PluginConfigurationService.prototype.processApiCall = function (query, response) {
  if (query.method) {
    switch (query.method) {
      case 'devicelist':
        this.sendJSON(this.pluginAccessories, response)
        break
      case 'ccu':
        this.sendJSON((this.pluginConfig) ? this.pluginConfig : {}, response)
        break
      case 'getSettings':
        let adr = query.adr
        this.sendJSON(this.getSettings(adr), response)
        break
      case 'services':
        this.sendJSON(this.serviceTemplates, response)
        break
      case 'reloadApplicances':
        let message = {
          topic: 'reloadApplicances'
        }
        this.process.send(message)
        this.sendJSON({ 'result': true }, response)
        break
      default:
        break
    }
  }
}

PluginConfigurationService.prototype.loadServiceTemplates = function () {
  let template = path.join(__dirname, 'data.json')
  if (fs.existsSync(template)) {
    let dta = fs.readFileSync(template)
    if (dta) {
      this.serviceTemplates = JSON.parse(dta)
    }
  }
}

PluginConfigurationService.prototype.settingsForType = function (devicetype, channeltype) {
  var result = []
  Object.keys(this.serviceTemplates).map(serviceKey => {
    let serviceData = this.serviceTemplates[serviceKey]
    let channelTypes = serviceData['ChannelType']
    if ((channelTypes.indexOf(channeltype) !== -1) || (channelTypes.indexOf(devicetype + ':' + channeltype) !== -1)) {
      result.push({ service: serviceKey, configuration: serviceData.Configuration })
    }
  })
  return result
}

PluginConfigurationService.prototype.run = async function () {
  let that = this
  logger.info('Running Configuration Service')
  await this.getStartupConfig()

  function handleRequest(request, response) {
    let parsed = url.parse(request.url, true)
    let filename = parsed.pathname
    if (filename === '/api/') {
      that.processApiCall(parsed.query, response)
    } else {
      that.sendFile(filename, response)
    }
  }

  this.server = http.createServer(handleRequest)
  this.server.listen(this.configServerPort, function () {
    logger.info('Running Configuration Server on Port %s', that.configServerPort)
  })
}

let pcs = new PluginConfigurationService()
pcs.run()
pcs.process = process
setInterval(() => {
  if (!process.connected) {
    logger.info('Shutdown Configuration Service')
    pcs.shutdown()
    process.exit(1)
  }
}, 10000)

process.on('message', (message) => {
  pcs.handleIncommingIPCMessage(message)
})

process.on('disconnect', () => {
  logger.info('Shutdown Configuration Service')
  pcs.shutdown()
  process.exit()
})
