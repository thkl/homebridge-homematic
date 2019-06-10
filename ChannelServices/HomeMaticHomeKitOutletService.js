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
    callback(null, this.currentState)
  }

  setState (value, callback) {
    this.command('set', 'STATE', value)
    callback()
  }

  get currentState () {
    if (this._currentState !== undefined) {
      return this._currentState
    }
    // no value found - get remote value
    this.remoteGetValue('STATE', (value) => {
      this.currentState = JSON.parse(value) // make sure the value is boolean
    })

    return this._currentState
  }

  set currentState (current) {
    if (this._currentState !== current) {
      this.onCharacteristic.updateValue(current)
    }
    this._currentState = current
  }

  event (address, dp, value) {
    if (this.address !== address) {
      return // skip not related events...
    }

    if (dp === 'STATE') {
      this.currentState = value
    }
  }
}

module.exports = HomeMaticHomeKitOutletService
