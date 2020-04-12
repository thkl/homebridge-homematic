'use strict'

const fs = require('fs')
const path = require('path')
const moment = require('moment')
const os = require('os')
const HomeMaticAddress = require(path.join(__dirname, '..', 'HomeMaticAddress.js'))
// Switch to ES6 Style
class HomeKitGenericService {
  constructor (accessory, log, platform, id, name, type, address, special, cfg, Service, Characteristic, deviceType) {
    log.debug('[Generic] constructor for %s with type %s', address, deviceType)
    this.log = log
    // only launch the complete stuff if there is a platform (we do need the classes also for validation of webservice config )
    if (platform) {
      this.accessory = accessory
      this.name = name
      this.displayName = name
      this.type = type
      this.deviceType = deviceType

      if (address === undefined) {
        log.warn('Device Address for %s is undefined this will end up in a desaster', name)
      }

      this.address = address
      this.deviceaddress = undefined

      // Build Deviceaddress

      let rgx = /([a-zA-Z0-9-]{1,}).([a-zA-Z0-9-]{1,}):([0-9]{1,})/g
      let parts = rgx.exec(address)
      if ((parts) && (parts.length > 3)) {
        this.intf = parts[1]
        this.serial = parts[2]
        this.channelnumber = parts[3]
        this.deviceaddress = this.intf + '.' + this.serial
      } else {
        this.log.warn('Unable to parse device address %s so nothing will work for %s', address, name)
      }

      this.platform = platform
      this.ccuManager = platform.homematicCCU
      /** deprecate this */
      this.state = []
      this.eventupdate = false
      this.special = special
      this.currentStateCharacteristic = []
      this.datapointMappings = []
      this.homeMaticDatapoints = []
      this.timer = []
      this.services = []
      this.usecache = true
      this.caddress = undefined
      this.cfg = cfg
      this.isWorking = false
      this.ignoreWorking = false // ignores the working=true flag and sets the value every time an event happends
      this.myDataPointName = undefined
      this.i_characteristic = {}
      this.intf = cfg['interface']
      this.datapointvaluefactors = {}
      this.readOnly = false
      this.lowBat = false
      this.lowBatCharacteristic = undefined
      this.accessoryName = this.name
      this.tampered = false
      this.tamperedCharacteristic = undefined
      this.delayOnSet = 0
      this.runsInTestMode = (typeof global.it === 'function')
      this.persistentStates = {}
      // will be false in Switches or so which are only one channel devices
      // will fix https://github.com/thkl/homebridge-homematic/issues/485
      this.isMultiChannel = true
      this.customService = false
      this.Characteristic = Characteristic
      var self = this

      if (self.address.indexOf('CUxD.') > -1) {
        this.usecache = false
      }

      if ((cfg !== undefined) && (cfg['combine'] !== undefined)) {
        var src = cfg['combine']['source']
        var trg = cfg['combine']['target']
        if (this.address.indexOf(src) > -1) {
          this.caddress = this.address.replace(src, trg)
        }
      }

      this.informationService =
      this.accessory.getService(Service.AccessoryInformation)

      this.informationService
        .setCharacteristic(Characteristic.Manufacturer, 'EQ-3')
        .setCharacteristic(Characteristic.Model, this.type)
        .setCharacteristic(Characteristic.Name, this.name)
        .setCharacteristic(Characteristic.SerialNumber, this.address)

      if (this.propagateServices !== undefined) {
        this.propagateServices(platform, Service, Characteristic)
      }

      // init old storage data
      if (this.deviceaddress !== undefined) {
        this.persistFile = path.join(this.platform.localPath, this.deviceaddress) + '.pstor'
        this.log.debug('[Generic] Pstore for %s is %s', this.deviceaddress, this.persistFile)
        if (fs.existsSync(this.persistFile)) {
          try {
            var buffer = fs.readFileSync(this.persistFile)
            this.persistentStates = JSON.parse(buffer.toString())
          } catch (e) {
            this.log.error(e)
          }
        } else {
          this.log.debug('[Generic] File doesnt exists. Will create a new one on the first etry')
        }
      }

      this.accessory.on('identify', this.callbackify(this.identify))
      this.createDeviceService(Service, Characteristic)
      this.serviceDidCreated()
    }
  }

  getService (ServiceType, name) {
    var result
    if (this.accessory.getService(ServiceType)) {
      result = this.accessory.getService(ServiceType, name || this.name)
    } else {
      this.log.debug('[Generic] addService')
      result = this.accessory.addService(ServiceType)

      if (!result) {
        this.log.warn('[Generic] unable to add service %s to accessory %s', ServiceType, this.accessory.name)
      }
    }
    let Characteristic = this.platform.homebridge.hap.Characteristic
    var nameCharacteristic =
      result.getCharacteristic(Characteristic.Name) ||
      result.addCharacteristic(Characteristic.Name)

    nameCharacteristic.setValue(name || this.name)

    return result
  }

  getCharacteristic (service, characteristicType) {
    var result = service.getCharacteristic(characteristicType)
    if (!result) {
      result = service.addOptionalCharacteristic(characteristicType)
    }
    return result
  }

  callbackify (fn) {
    let self = this
    return async (value, callback) => {
      try {
        let data = await fn.bind(this)(value)
        callback(null, data)
      } catch (err) {
        self.log.error(err)
        callback(err)
      }
    }
  }

  setCCUManager (ccuManager) {
    this.ccuManager = ccuManager
  }

  /**
     * link a datapoint to a characteristic
     * @param  {[type]} key             Datapointname or channeladdress
     * @param  {[type]} aCharacteristic Characteristic to link
     * @return {[type]}
     */
  setCurrentStateCharacteristic (key, aCharacteristic) {
    if (key.indexOf('.') === -1) {
      key = this.channelnumber + '.' + key
    }
    this.currentStateCharacteristic[key] = aCharacteristic
  }

  /**
     * returns a characteristic for a linked datapoint
     * @param  {[type]} key Datapointname or channeladdress
     * @return {[type]}     linked characteristic
     */
  getCurrentStateCharacteristic (key) {
    if (key.indexOf('.') === -1) {
      key = this.channelnumber + '.' + key
    }
    return this.currentStateCharacteristic[key]
  }

  /**
     * Check if the Event was triggerd by a Datapointname
     * @param  {[type]} dp_i    Eventkey
     * @param  {[type]} dp_test Datapoint name (channel address will be autocompleted)
     * @return {[type]}         true if the eventkey matches the datapoint name
     */
  isDataPointEvent (dPi, dPTest) {
    let dpHmTest1 = dPi
    let dpHmTest2 = dPTest

    if (typeof dPi === 'string') {
      this.log.debug('[Generic] create new HMAddress from %s', dPi)
      dpHmTest1 = this.buildHomeMaticAddress(dPi)
    }

    if (typeof dPTest === 'string') {
      this.log.debug('[Generic] create new HMAddress from %s', dPTest)
      dpHmTest2 = this.buildHomeMaticAddress(dPTest)
    }

    this.log.debug('[Generic] isDataPointEvent check %s vs %s', dpHmTest1.address(), dpHmTest2.address())
    return dpHmTest1.match(dpHmTest2)
  }

  /**
     * checks if a array contains a undefined element
     * @param  {[type]} array
     * @return {[type]}       returns true if all elements are defined
     */
  haz (array) {
    var result = true
    if (array) {
      array.some(element => {
        if (element === undefined) {
          result = false
        }
      })
    }
    return result
  }

  /**
     * Returns a stored value for a key specified for the current channel
     *
     * @param  {[type]} key          a key
     * @param  {[type]} defaultValue value to return if there is no previously saved value
     * @return {[type]}              the value
     */
  getPersistentState (key, defaultValue) {
    if ((this.persistentStates !== undefined) && (this.persistentStates[key] !== undefined)) {
      return this.persistentStates[key]
    } else {
      return defaultValue
    }
  }

  /**
     * saves a value for a key persistent to disc
     * @param  {[type]} key   the key
     * @param  {[type]} value the value
     * @return {[type]}
     */
  setPersistentState (key, value) {
    if (this.persistentStates === undefined) {
      this.log.debug('[Generic] new store')
      this.persistentStates = {}
    }
    this.persistentStates[key] = value
    // save this
    if (this.persistFile !== undefined) {
      try {
        var buffer = JSON.stringify(this.persistentStates)
        fs.writeFileSync(this.persistFile, buffer)
      } catch (e) {
        // just ignore
      }
    }
  }

  /**
  * add FakeGato History object only if not in a testcase
  **/
  enableLoggingService (type, disableTimer) {
    if (this.runsInTestMode === true) {
      this.log.debug('[Generic] Skip Loging Service for %s because of testmode', this.displayName)
    } else {
      if (disableTimer === undefined) {
        disableTimer = true
      }
      var FakeGatoHistoryService = require('fakegato-history')(this.platform.homebridge)
      this.log.debug('[Generic] Adding Log Service for %s with type %s', this.displayName, type)
      var hostname = os.hostname()
      let filename = hostname + '_' + this.address + '_persist.json'
      this.loggingService = new FakeGatoHistoryService(type, this, {
        storage: 'fs',
        filename: filename,
        path: this.platform.localPath,
        disableTimer: disableTimer
      })
      this.services.push(this.loggingService)
    }
  }

  /**
     * adds a characteristic to the current logging service
     * @param  {[type]} aCharacteristic [description]
     * @return {[type]}                 [description]
     */
  addLoggingCharacteristic (aCharacteristic) {
    if ((this.runsInTestMode === true) || (this.loggingService === undefined)) {
      this.log.debug('[Generic] adding Characteristic skipped for %s because of testmode ', this.displayName)
    } else {
      this.loggingService.addOptionalCharacteristic(aCharacteristic)
    }
  }

  /**
     * returns a characteristic from the current logging service
     * @param  {[type]} aCharacteristic [description]
     * @return {[type]}                 [description]
     */
  getLoggingCharacteristic (aCharacteristic) {
    if ((this.runsInTestMode === true) || (this.loggingService === undefined)) {
      this.log.debug('[Generic] get Characteristic not available for %s because of testmode', this.displayName)
      return undefined
    } else {
      return this.loggingService.getCharacteristic(aCharacteristic)
    }
  }

  /**
     * adds a log entry
     * @param  {[type]} data {key:value}
     * @return {[type]}      [description]
     */
  addLogEntry (data) {
    // check if loggin is enabled
    if ((this.loggingService !== undefined) && (data !== undefined)) {
      data.time = moment().unix()
      // check if the last logentry was just recently and is the same as the previous
      var logChanges = true
      // there is a previous logentry, let's compare...
      if (this.lastLogEntry !== undefined) {
        this.log.debug('[Generic] addLogEntry lastLogEntry is  available')
        logChanges = false
        // compare data
        var self = this
        Object.keys(data).forEach(key => {
          if (key === 'time') {
            return
          }
          // log changes if values differ
          if (data[key] !== self.lastLogEntry[key]) {
            self.log.debug('[Generic] lastLogEntry is different')
            logChanges = true
          }
        })
        // log changes if last log entry is older than 7 minutes,
        // homematic usually sends updates evry 120-180 seconds
        if ((data.time - self.lastLogEntry.time) > 7 * 60) {
          logChanges = true
        }
      }

      if (logChanges) {
        this.log.debug('[Generic] Saving log data for %s: %s', this.displayName, JSON.stringify(data))
        this.loggingService.addEntry(data)
        this.lastLogEntry = data
      } else {
        this.log.debug('[Generic] log did not change %s', this.displayName)
      }
    }
  }

  /**
     * returns a class configuration value by a key
     * @param  {[type]} key          [description]
     * @param  {[type]} defaultValue [description]
     * @return {[type]}              [description]
     */
  getClazzConfigValue (key, defaultValue) {
    this.log.debug('[Generic] Get Config value for %s', key)
    this.log.debug('[Generic] Config is %s', JSON.stringify(this.cfg))
    var result = defaultValue
    if (this.cfg !== undefined) {
      if (this.cfg[key] !== undefined) {
        result = this.cfg[key]
      }
    }
    return result
  }

  /**
     * adds the low bat characteristic to the current service. this will also auto enable event listening for LOWBAT Events
     * @param  {[type]} rootService    [description]
     * @param  {[type]} Characteristic [description]
     * @return {[type]}                [description]
     */
  addLowBatCharacteristic (rootService, Characteristic) {
    var bat = rootService.getCharacteristic(Characteristic.StatusLowBattery)

    if (bat !== undefined) {
      this.lowBatCharacteristic = bat
    } else {
      // not added by default -> create it
      this.log.debug('[Generic] added LowBat to %s', this.name)
      rootService.addOptionalCharacteristic(Characteristic.StatusLowBattery)
      this.lowBatCharacteristic = rootService.getCharacteristic(Characteristic.StatusLowBattery)
    }
  }

  /**
     * adds the sabotage characteristic to the current service. this will also auto enable event listening for .SABOTAGE and .ERROR_SABOTAGE
     * @param  {[type]} rootService    [description]
     * @param  {[type]} Characteristic [description]
     * @param  {[type]} address        [description]
     * @return {[type]}                [description]
     */
  addTamperedCharacteristic (rootService, Characteristic, address) {
    var tampered = rootService.getCharacteristic(Characteristic.StatusTampered)

    if (tampered !== undefined) {
      this.tamperedCharacteristic = tampered
    } else {
      // not added by default -> create it
      this.log.debug('[Generic] added Tampered to %s', this.name)
      rootService.addOptionalCharacteristic(Characteristic.StatusTampered)
      this.tamperedCharacteristic = rootService.getCharacteristic(Characteristic.StatusTampered)
    }
    if (address !== undefined) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.deviceaddress + ':' + address, this)
    }
  }

  /**
     * set the current Service to readonly
     * @param  {[type]} readOnly [description]
     * @return {[type]}          [description]
     */
  setReadOnly (readOnly) {
    this.readOnly = readOnly
    if (readOnly === true) {
      this.log.debug('[Generic] setReadOnly %s to read only', this.name)
    }
  }

  addValueMapping (dp, value, mappedvalue) {
    if (this.datapointMappings[dp] === undefined) {
      this.datapointMappings[dp] = []
    }
    this.datapointMappings[dp][value] = mappedvalue
  }

  addValueFactor (dp, factor) {
    this.datapointvaluefactors[dp] = factor
  }

  // Return current States
  query (dp, callback) {
    var self = this
    this.log.debug('[Generic] query %s', dp)
    if (self.usecache === false) {
      self.remoteGetValue(dp, value => {
        if (callback !== undefined) {
          callback(value)
        }
      })
    } else

    if (self.usecache === true) {
      let cvalue = self.getCache(dp)
      if (cvalue) {
        if (callback) {
          callback(cvalue)
        }
      } else {
        self.remoteGetValue(dp, value => {
          self.setCache(dp, value)
          if (callback !== undefined) {
            callback(value)
          }
        })
      }
    }
  }

  setCache (dp, value) {
    let tp = this.buildHomeMaticAddress(dp)
    this.ccuManager.doCache(tp.address(), value)
  }

  getCache (dp) {
    let tp = this.buildHomeMaticAddress(dp)
    if (tp) {
      return this.ccuManager.getCache(tp.address())
    } else {
      this.log.warn('[Generic] unable to parse datapoint %s for %s', dp, this.accessoryName)
      this.log.warn('[Generic] at %s', new Error('').stack)
      return undefined
    }
  }

  removeCache (dp) {
    let tp = this.buildHomeMaticAddress(dp)
    this.ccuManager.removeCache(tp.address())
  }

  cleanVirtualDevice (dp) {
    if (this.address.indexOf('VirtualDevices.') > -1) {
      let tp = this.buildHomeMaticAddress(dp)
      // Remove cached Date from Virtual Devices cause the do not update over rpc
      this.removeCache(tp.address())
    }
    this.remoteGetValue(dp, value => {

    })
  }

  dpvalue (dp, fallback) {
    let cvalue = this.getCache(dp)
    if (cvalue !== undefined) {
      return (cvalue)
    } else {
      return fallback
    }
  }

  convertValue (dp, value) {
    var result = value
    var char = this.currentStateCharacteristic[dp]
    if (char !== undefined) {
      this.log.debug('[Generic] Format is:%s', char.props.format)
      switch (char.props.format) {
        case 'int':
        case 'uint8':
          if (value === 'true') {
            result = 1
          } else

          if (value === 'false') {
            result = 0
          } else

          if (value === true) {
            result = 1
          } else

          if (value === false) {
            result = 0
          } else {
            result = parseInt(value)
          }
          break
        case 'uint16':
        case 'uint32':
          result = parseInt(value)
          break
        case 'float':
          result = parseFloat(value)
          break
        case 'bool':
          if (value === true) {
            result = 1
          } else
          if (value === 'true') {
            result = 1
          } else
          if (value === '1') {
            result = 1
          } else
          if (value === 1) {
            result = 1
          } else {
            result = 0
          }
          break
      }
    }
    this.log.debug('[Generic] Convert %s for %s is %s', value, dp, result)
    return result
  }

  remoteSetDatapointValue (addressdatapoint, value, callback) {
    let tp = this.buildHomeMaticAddress(addressdatapoint)
    if (tp.isValid()) {
      this.log.debug('[Generic] remoteSetDatapointValue I:%s|D:%s|C:%s|:D%s  Value %s', tp.intf, tp.serial, tp.channelId, tp.dpName, value)
      this.ccuManager.setValue(tp, value)
      if (callback) {
        callback()
      }
    } else {
      this.log.error('[Generic] %s : Syntax error in device address', addressdatapoint)
      if (callback) {
        callback(undefined)
      }
    }
  }

  remoteGetDataPointValue (addressdatapoint, callback) {
    var self = this
    let tp = this.buildHomeMaticAddress(addressdatapoint)
    if (tp.isValid()) {
      // Kill cached value
      self.removeCache(addressdatapoint)
      self.ccuManager.getValue(tp, newValue => {
        if ((newValue !== undefined) && (newValue !== null)) {

        } else {
          // newValue = 0;
          newValue = self.convertValue(tp.dpName, 0)
        }

        if (callback !== undefined) {
          callback(newValue)
        }
      })
    } else {
      this.log.error('[Generic] %s : Syntax error in device address', addressdatapoint)
      callback(undefined)
    }
  }

  remoteGetDeviceValue (address, dp, callback) {
    var self = this
    var interf = this.intf
    self.ccuManager.getValue(interf, address, dp, newValue => {
      if ((newValue !== undefined) && (newValue !== null)) {
        self.eventupdate = true
        // var ow = newValue;
        newValue = self.convertValue(dp, newValue)
        self.cache(this.address + '.' + dp, newValue)
        self.eventupdate = false
      } else {
        // newValue = 0;
        newValue = self.convertValue(dp, 0)
      }

      if (callback !== undefined) {
        callback(newValue)
      }
    })
  }

  remoteGetValue (dp, callback) {
    var self = this
    this.log.debug('[Generic] remoteGetValue %s', dp)
    var tp = this.buildHomeMaticAddress(dp)
    if (tp) {
      this.log.debug('[Generic] datapoint %s', tp.dpName)
      this.log.debug('[Generic] remoteGetValue Intf:%s, Adre:%s, ChI:%s, Dp:%s', tp.intf, tp.serial, tp.channelId, tp.dpName)

      if (tp.intf === 'Var') {
      // This is a variable so get the value
        let script = "WriteLine(dom.GetObject(ID_SYSTEM_VARIABLES).Get('" + tp.serial + "').State());"
        this.command('sendregacommand', '', script, function (result) {
        // do not cache this
          if (callback) {
            self.log.debug('[Generic] run callback on variable %s with %s', tp.serial, result)
            callback(result)
          } else {
            self.log.debug('[Generic] remoteGetValue response; empty callback route via event for Variable %s value is %s', tp.serial, result)
            self.platform.fireEvent(tp.intf, tp.serial, tp.channelId, tp.dpName, result)
          }
        })
      } else {
        self.ccuManager.getValue(tp, newValue => {
          self.log.debug('[Generic] got value for %s (Value:%s)', tp.address(), newValue)
          if (callback !== undefined) {
            // we have a callback so we have to convert some stuff here cache the value
            // and run the callback
            if ((newValue !== undefined) && (newValue !== null)) {
              var processedValue = newValue

              if ((tp[1] === 'COLOR') && (self.type === 'RGBW_COLOR')) {
                processedValue = Math.round((newValue / 199) * 360)
              }

              if (tp[1] === 'BRIGHTNESS') {
                processedValue = Math.pow(10, (newValue / 51))
              }

              self.eventupdate = true
              // var ow = newValue;
              processedValue = self.convertValue(dp, processedValue)
              self.log.debug('[Generic] will cache %s for %s', processedValue, tp.address())
              self.cache(tp.address(), processedValue)
              self.eventupdate = false
            } else {
              // newValue = 0;
              processedValue = self.convertValue(dp, 0)
            }
            self.log.debug('[Generic] run callback with %s', newValue)
            callback(newValue)
          } else {
            // otherwise we will fire datapoint change event
            // the conversion will be done there
            self.log.debug('[Generic] remoteGetValue response; empty callback route via event for %s:%s.%s value is %s', tp.serial, tp.channelId, tp.dpName, newValue)
            // send a Event - we have to walk a extra round to get the enclosure function back
            self.platform.fireEvent(tp.intf, tp.serial, tp.channelId, tp.dpName, newValue)
          }
        })
      }
    }
  }

  isDatapointAddressValid (datapointAddress, acceptNull) {
    this.log.debug('[Generic] validate datapoint %s we %s accept nul', datapointAddress, acceptNull ? 'do' : 'do not')
    if (datapointAddress !== undefined) {
      let parts = datapointAddress.split('.')
      // check we have 3 parts interface.address.name
      if (parts.length !== 3) {
        this.log.error('[Generic] %s is invalid not 3 parts', datapointAddress)
        return false
      }
      // check the address has a :
      if (parts[1].indexOf(':') === -1) {
        this.log.error('[Generic] %s is invalid %s does not contain a :', datapointAddress, parts[1])
        return false
      }
      return true
    } else {
      // dp is undefined .. check if this is valid
      if (acceptNull === false) {
        this.log.error('[Generic] null is not a valid datapoint')
      }
      return acceptNull
    }
  }

  addHomeMaticDatapoint (dp) {
    if ((typeof dp === 'object') && (dp.address())) {
      this.homeMaticDatapoints.push(dp.address())
    } else {
      this.homeMaticDatapoints.push(dp)
    }
  }

  endWorking () {

  }

  // Event with complete channel and dp infos
  channelDatapointEvent (channel, dp, newValue) {
    // just a stub
  }

  // Event only with datapoint infos
  datapointEvent (dp, newValue, channel) {

  }

  createDeviceService (Service, Characteristic) {

  }

  serviceDidCreated () {
    let self = this
    this.homeMaticDatapoints.map(dp => {
      self.log.debug('[Generic] serviceDidCreated Initial query for %s', dp)
      self.remoteGetValue(dp)
    })
  }

  event (dpadress, newValue, optionalFunction) {
    this.log.debug('[Generic] event for %s with value %s', dpadress, newValue)
    var self = this
    var targetChar

    if (dpadress !== undefined) {
      var tp
      // generate a homematic address if the input is a string
      if (typeof dpadress === 'string') {
        tp = this.buildHomeMaticAddress(dpadress)
      } else {
        tp = dpadress
      }

      if (tp.dpName === 'LOWBAT') {
        self.lowBat = newValue
        if (self.lowBatCharacteristic !== undefined) {
          self.lowBatCharacteristic.setValue(newValue)
        }
      }

      if ((tp.dpName === 'ERROR_SABOTAGE') || (tp.dpName === 'SABOTAGE')) {
        self.tampered = ((newValue === 1) || (newValue === true))
        if (self.tamperedCharacteristic !== undefined) {
          self.tamperedCharacteristic.setValue(newValue)
        }
      }

      if (tp.dpName === 'ERROR') {
        self.tampered = (newValue === 7)
        if (self.tamperedCharacteristic !== undefined) {
          self.tamperedCharacteristic.setValue(newValue)
        }
      }

      if ((tp.dpName === 'COLOR') && (this.type === 'RGBW_COLOR')) {
        newValue = Math.round((newValue / 199) * 360)
      }
      if (tp.dpName === 'BRIGHTNESS') {
        newValue = Math.pow(10, (newValue / 51))
      }

      if (tp.dpName === 'PRESS_SHORT') {
        targetChar = self.currentStateCharacteristic[tp.dpName]
        if (targetChar !== undefined) {
          // The value property of ProgrammableSwitchEvent must be one of the following:
          // Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS = 0;
          // Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS = 1;
          // Characteristic.ProgrammableSwitchEvent.LONG_PRESS = 2;
          targetChar.setValue(0)
        }
        this.channelDatapointEvent(dpadress, newValue)
        if (typeof optionalFunction === 'function') {
          optionalFunction.call(this, newValue)
        }
        this.datapointEvent(tp, newValue)
        return
      }
      if (tp.dpName === 'PRESS_LONG') {
        targetChar = self.currentStateCharacteristic[tp.dpName]
        if (targetChar !== undefined) {
          targetChar.setValue(2)
        }
        this.channelDatapointEvent(dpadress, newValue)
        if (typeof optionalFunction === 'function') {
          optionalFunction.call(this, newValue)
        }
        this.datapointEvent(tp, newValue)
        return
      }

      var factor = this.datapointvaluefactors[tp.dpName]

      if (factor !== undefined) {
        newValue = newValue * factor
      }

      if (tp.dpName === 'WORKING') {
        if ((self.isWorking === true) && (newValue === false)) {
          self.endWorking()
        }
        self.isWorking = newValue
      }
      this.eventupdate = true

      if (typeof optionalFunction === 'function') {
        this.log.debug('[Generic] we do have a registred event callback send %s to this one', newValue)
        optionalFunction.call(this, newValue)
      }

      if ((this.caddress !== undefined) || (this.deviceaddress !== undefined)) {
        // this is dirty shit. ok there is a config self will set the caddress to a defined channel
        // if there is an rpc event at this channel the event will be forward here.
        // now fetch the real address of self channel and get the channelnumber
        // datapoints from such channels named  as channelnumber:datapoint ... (no better approach yet)
        this.cache(tp.address(), newValue)
        this.log.debug('[Generic] datapointEvent on %s with Value:%s', tp.address(), newValue)
        this.datapointEvent(tp, newValue)
      } else {
        this.cache(tp.address(), newValue)
        this.log.debug('[Generic] datapointEvent on %s with Value:%s', tp.address(), newValue)
        this.datapointEvent(tp, newValue)
      }
      this.channelDatapointEvent(tp, newValue)
      this.eventupdate = false
    } else {
      this.log.warn('[Generic] address is undefined')
    }
  }

  mappedValue (dp, value) {
    var result = value
    var map = this.datapointMappings[dp]
    if (map !== undefined) {
      if (map[value] !== undefined) {
        result = map[value]
      }
    }
    return result
  }

  stateCharacteristicWillChange (characteristic, newValue) {
    // just a stub
  }

  stateCharacteristicDidChange (characteristic, newValue) {
    // just a stub
  }

  cache (dp, value) {
    var self = this

    this.log.debug('[Generic] cache %s (%s)', dp, value)
    // Check custom Mapping from HM to HomeKit
    var map = self.datapointMappings[dp]
    if (map !== undefined) {
      if (map[value] !== undefined) {
        value = map[value]
      }
    }
    if ((value !== undefined) && ((self.isWorking === false) || (self.ignoreWorking === true))) {
      if (self.currentStateCharacteristic[dp] !== undefined) {
        self.stateCharacteristicWillChange(self.currentStateCharacteristic[dp], value)
        self.currentStateCharacteristic[dp].setValue(value, null)
        self.stateCharacteristicDidChange(self.currentStateCharacteristic[dp], value)
      }
      this.ccuManager.doCache(dp, value)
    } else {
      self.log.debug('[Generic] Skip update because of working flag (%s) or IsNull(%s)', self.isWorking, value)
    }
  }

  delayed (mode, dp, value, delay) {
    this.log.debug('[Generic] delayed mode %s DP %s Value %s delay %s', mode, dp, value, delay)
    let self = this
    if (this.eventupdate === true) {
      return
    }
    if (delay > 0) {
      if (this.timer[dp] !== undefined) {
        clearTimeout(this.timer[dp])
        this.timer[dp] = undefined
      }
      this.timer[dp] = setTimeout(function () {
        clearTimeout(self.timer[dp])
        self.timer[dp] = undefined
        self.command(mode, dp, value)
      }, delay || 100)
    } else {
      this.log.debug('[Generic] send command mode %s DP %s Value', mode, dp, value)
      self.command(mode, dp, value)
    }
  }

  remoteSetDeviceValue (address, dp, value, callback) {
    this.log.debug('[Generic] (Rpc) Send ' + value + ' to Datapoint ' + dp + ' at ' + address)
    this.ccuManager.setValue(undefined, address, dp, value)
  }

  command (mode, dp, value, callback) {
    var newValue = value
    var self = this

    if (mode === 'sendregacommand') {
      // just send the command and ten return
      self.ccuManager.runScript(newValue, callback)
    } else {
      var tp = this.buildHomeMaticAddress(dp)
      if ((tp.dpName === 'LEVEL') || (tp.dpName === 'LEVEL_2')) {
        newValue = parseFloat(newValue)
        newValue = {
          'explicitDouble': newValue
        }
      }
      if ((tp.dpName === 'COLOR') && (this.type === 'RGBW_COLOR')) {
        newValue = Math.round((value / 360) * 199)
      }
    }

    if (this.eventupdate === true) {
      return
    }

    if (mode === 'set') {
      // var interf = this.intf
      // Kill cache value so we have to ask the interface afterwards
      self.log.debug('[Generic] Kill Cache for %s', tp.address())
      self.ccuManager.removeCache(tp.address())
      self.log.debug('[Generic] Send %s to Datapoint:%s type %s', JSON.stringify(newValue), tp.address(), typeof newValue)
      self.ccuManager.setValue(tp, newValue)
      if (callback !== undefined) {
        callback()
      }
    }

    if (mode === 'setrega') {
      self.log.debug('[Generic] (Rega) Send %s to %s type %s', newValue, tp.address(), typeof newValue)
      self.ccuManager.setValue(tp, newValue)
      if (callback !== undefined) {
        callback()
      }
    }
  }

  buildHomeMaticAddress (dp) {
    this.log.debug('[Generic] buildHomeMaticAddress %s', dp)

    if ((dp) && (typeof dp === 'string')) {
      var pos = dp.indexOf('.')
      if (pos === -1) {
        this.log.debug('[Generic] seems to be a single datapoint')
        let result = new HomeMaticAddress(this.intf, this.serial, this.channelnumber, dp)
        return result
      }

      let rgx = /([a-zA-Z0-9-]{1,}).([a-zA-Z0-9-]{1,}):([0-9]{1,}).([a-zA-Z0-9-_]{1,})/g
      let parts = rgx.exec(dp)
      if ((parts) && (parts.length > 4)) {
        let intf = parts[1]
        let address = parts[2]
        let chidx = parts[3]
        let dpn = parts[4]
        this.log.debug('[Generic] try I.A:C.D Format |I:%s|A:%s|C:%s|D:%s', intf, address, chidx, dpn)
        return new HomeMaticAddress(intf, address, chidx, dpn)
      } else {
        // try format channel.dp
        let rgx = /([0-9]{1,}).([a-zA-Z0-9-_]{1,})/g
        let parts = rgx.exec(dp)
        if ((parts) && (parts.length === 3)) {
          let chidx = parts[1]
          let dpn = parts[2]
          this.log.debug('[Generic] match C.D Format |I:%s|A:%s|C:%s|D:%s', this.intf, this.serial, chidx, dpn)
          return new HomeMaticAddress(this.intf, this.serial, chidx, dpn)
        }
      }
    } else {
      this.log.error('[Generic] unable create HM Address from undefined Input %s', dp)
    }
  }

  getServices () {
    return this.accessory.services
  }

  shutdown () {
    this.tidyUpAccessory()
  }

  tidyUpCharacteristic (characteristic) {
    if (characteristic) {
      characteristic.removeAllListeners('get')
      characteristic.removeAllListeners('set')
    }
  }

  tidyUpService (service) {
    let self = this
    if (service) {
      service.characteristics.map(characteristic => {
        self.tidyUpCharacteristic(characteristic)
      })
    }
  }

  tidyUpAccessory () {
    let self = this
    this.accessory.services.map(service => {
      self.tidyUpService(service)
    })
  }

  identify (state) {
    this.log.info('Identify %s (%s)', this.name, state)
  }

  round (val, precision) {
    if (typeof val !== 'number') {
      return val
    }

    if (!Number.isInteger(precision)) {
      return val
    }

    const exponent = precision > 0 ? 'e' : 'e-'
    const exponentNeg = precision > 0 ? 'e-' : 'e'
    precision = Math.abs(precision)

    return Number(Math.sign(val) * (Math.round(Math.abs(val) + exponent + precision) + exponentNeg + precision))
  }

  isTrue (value) {
    var result = false
    if ((typeof value === 'string') && (value.toLocaleLowerCase() === 'true')) {
      result = true
    }
    if ((typeof value === 'string') && (value.toLocaleLowerCase() === '1')) {
      result = true
    }

    if ((typeof value === 'number') && (value === 1)) {
      result = true
    }

    if ((typeof value === 'boolean') && (value === true)) {
      result = true
    }

    return result
  }

  didMatch (v1, v2) {
    if (typeof v1 === typeof v2) {
      return (v1 === v2)
    }

    if (((typeof v1 === 'number') && (typeof v2 === 'string')) || ((typeof v1 === 'string') && (typeof v2 === 'number'))) {
      return parseFloat(v1) === parseFloat(v2)
    }

    if ((typeof v1 === 'boolean') && (typeof v2 === 'string')) {
      if (v1 === true) {
        return (v2.toLocaleLowerCase() === 'true')
      }
      if (v1 === false) {
        return (v2.toLocaleLowerCase() === 'false')
      }
    }

    if ((typeof v2 === 'boolean') && (typeof v1 === 'string')) {
      if (v2 === true) {
        return (v1.toLocaleLowerCase() === 'true')
      }
      if (v2 === false) {
        return (v1.toLocaleLowerCase() === 'false')
      }
    }

    if ((typeof v1 === 'boolean') && (typeof v2 === 'number')) {
      return (((v1 === true) && (v2 === 1)) || ((v1 === false) && (v2 === 0)))
    }

    if ((typeof v2 === 'boolean') && (typeof v1 === 'number')) {
      return (((v2 === true) && (v1 === 1)) || ((v2 === false) && (v1 === 0)))
    }

    return false
  }

  // used for webConfig
  validateConfig (configuration) {
    return true
  }

  configItems () {
    return []
  }
}

module.exports = {
  HomeKitGenericService: HomeKitGenericService
}
