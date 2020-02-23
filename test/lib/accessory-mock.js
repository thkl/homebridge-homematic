var Service = require('./service-mock').Service

function Accessory () {
  this.services = []
  this.addService(Service.AccessoryInformation)
}

Accessory.prototype.addService = function (service) {
  // service might be a constructor like `Service.AccessoryInformation` instead of an instance
  // of Service. Coerce if necessary.
  if (typeof service === 'function') { service = new (Function.prototype.bind.apply(service, arguments))() }

  // check for UUID+subtype conflict
  for (var index in this.services) {
    var existing = this.services[index]
    if (existing.UUID === service.UUID) {
      // OK we have two Services with the same UUID. Check that each defines a `subtype` property and that each is unique.
      if (!service.subtype) { throw new Error("Cannot add a Service with the same UUID '" + existing.UUID + "' as another Service in this Accessory without also defining a unique 'subtype' property.") }

      if (service.subtype.toString() === existing.subtype.toString()) { throw new Error("Cannot add a Service with the same UUID '" + existing.UUID + "' and subtype '" + existing.subtype + "' as another Service in this Accessory.") }
    }
  }

  this.services.push(service)
  return service
}

Accessory.prototype.getService = function (name) {
  for (var index in this.services) {
    var service = this.services[index]

    if (typeof name === 'string' && (service.displayName === name || service.name === name || service.subtype === name)) { return service } else if (typeof name === 'function' && ((service instanceof name) || (name.UUID === service.UUID))) { return service }
  }
}

Accessory.prototype.on = function (name, callback) {
}

module.exports = {
  Accessory: Accessory
}
