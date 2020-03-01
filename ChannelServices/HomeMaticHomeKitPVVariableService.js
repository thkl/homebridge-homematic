'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService
const EveHomeKitTypes = require('./EveHomeKitTypes.js')
let eve

class HomeMaticHomeKitPVVariableService extends HomeKitGenericService {
  shutdown () {
    super.shutdown()
    clearTimeout(this.refreshTimer)
  }

  propagateServices (homebridge, Service, Characteristic) {
    eve = new EveHomeKitTypes(homebridge)
  }

  createDeviceService (Service, Characteristic) {
    var self = this
    // Enable the Logging Service for Energy

    this.varPower = this.getClazzConfigValue('varpower', undefined)
    this.historyEnabled = this.getClazzConfigValue('enable_history', false)
    if (this.historyEnabled === true) {
      this.enableLoggingService('energy')
    }

    var sensor = this.getService(eve.Service.PowerMeterService)

    if (this.varPower !== undefined) {
      this.power = sensor.getCharacteristic(eve.Characteristic.ElectricPower)
        .on('get', function (callback) {
          self.queryVariable(self.varPower, function (value) {
            if (self.historyEnabled === true) {
              self.addLogEntry({ power: parseFloat(value) })
            }
            if (callback) callback(null, parseFloat(value))
          })
        })
      // Add the variable to the global update service
      this.log.debug('[PVSim] adding %s to updater', this.varPower)
      this.platform.addServiceVariable(this.varPower)
      this.power.eventEnabled = true
    }

    if (this.power !== undefined) {
      this.platform.registeraddressForEventProcessingAtAccessory(this.buildHomeMaticAddress('Var.' + this.varPower + ':1.STATE'), this, function (newValue) {
        self.power.updateValue(newValue, null)

        if (self.historyEnabled === true) {
          self.addLogEntry({ power: parseFloat(newValue) })
        }
      })
    }
  }

  queryVariable (name, callback) {
    let script = "WriteLine(dom.GetObject(ID_SYSTEM_VARIABLES).Get('" + name + "').State());"
    this.command('sendregacommand', '', script, function (result) {
      if (callback) {
        callback(result)
      }
    })
  }

  queryData () {
    var self = this
    if (this.varPower) {
      this.queryVariable(this.varPower)
    }
    // create timer to query device every 10 minutes
    this.refreshTimer = setTimeout(function () { self.queryData() }, 10 * 60 * 1000)
  }

  validateConfig (configuration) {
    // things to check
    return ((configuration) &&
    (configuration.varpower)
    )
  }

  configItems () {
    return ['varpower', 'enable_history']
  }
}

module.exports = HomeMaticHomeKitPVVariableService
