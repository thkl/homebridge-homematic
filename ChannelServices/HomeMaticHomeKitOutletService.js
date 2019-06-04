'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js')
  .HomeKitGenericService

class HomeMaticHomeKitOutletService extends HomeKitGenericService {
  createDeviceService (Service, Characteristic) {
    this.ignoreWorking = true
    this.address = this.adress // fix spelling

    var service = new Service.Outlet(this.name)
    this.onCharacteristic = service.getCharacteristic(Characteristic.On)
    this.onCharacteristic
      .on('get', this.getState.bind(this))
      .on('set', this.setState.bind(this))

    // Set outlet in use to return always true
    service.getCharacteristic(Characteristic.OutletInUse)
      .on('get', (callback) => {
        callback(null, 1)
      })

    this.log.debug('Creating new Outlet service for %s: %s, : %s', this.name, this.deviceAdress, this.address)
    this.services.push(service)
  }

  getState (callback) {
    this.query('STATE', (value) => {
      callback(null, JSON.parse(value)) // make sure the value is boolean
    })
  }

  setState (value, callback) {
    this.command('set', 'STATE', value)
    callback()
  }

  event (address, dp, value) {
    if (this.address !== address) {
      return // skip not related events...
    }

    if (dp === 'STATE') {
      this.onCharacteristic.updateValue(value)
    }
  }
}

module.exports = HomeMaticHomeKitOutletService
