'use strict'

const HomeKitGenericService = require('./HomeKitGenericService.js').HomeKitGenericService

class HomeMaticHomeKitDummyService extends HomeKitGenericService {
  propagateServices (homebridge, Service, Characteristic) {

    // Register new Characteristic or Services here

  }

  createDeviceService (Service, Characteristic) {
    // Fill Servicelogic here
  }
}

module.exports = HomeMaticHomeKitDummyService
