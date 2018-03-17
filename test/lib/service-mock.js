var util = require('util');
var inherits = require('util').inherits;
var Characteristic = require('./characteristic-mock');

function Service(displayName, UUID, subtype) {
  
  if (!UUID) throw new Error("Services must be created with a valid UUID.");

  this.displayName = displayName;
  this.UUID = UUID;
  this.subtype = subtype;

  this.characteristics = [];  
  this.optionalCharacteristics =[];
}

Service.prototype.addCharacteristic = function(characteristic) {
  // characteristic might be a constructor like `Characteristic.Brightness` instead of an instance
  // of Characteristic. Coerce if necessary.
  if (typeof characteristic === 'function') {
      characteristic = new (Function.prototype.bind.apply(characteristic, arguments));
  }
  // check for UUID conflict
  for (var index in this.characteristics) {
    var existing = this.characteristics[index];
    if (existing.UUID === characteristic.UUID)
      throw new Error("Cannot add a Characteristic with the same UUID as another Characteristic in this Service: " + existing.UUID);
  }
  
  this.characteristics.push(characteristic);

  return characteristic;
};

Service.prototype.addOptionalCharacteristic = function(characteristic) {
  // characteristic might be a constructor like `Characteristic.Brightness` instead of an instance
  // of Characteristic. Coerce if necessary.
  if (typeof characteristic === 'function')
    characteristic = new characteristic();

  this.optionalCharacteristics.push(characteristic);
};

Service.prototype.setCharacteristic = function(name, value) {
  this.getCharacteristic(name).setValue(value);
  return this; // for chaining
};

Service.prototype.getCharacteristic = function(name) {
    // returns a characteristic object from the service
    // If  Service.prototype.getCharacteristic(Characteristic.Type)  does not find the characteristic, 
    // but the type is in optionalCharacteristics, it adds the characteristic.type to the service and returns it.
    var index, characteristic;
    for (index in this.characteristics) {
        characteristic = this.characteristics[index];
        if (typeof name === 'string' && characteristic.displayName === name) {
            return characteristic;
        }
        else if (typeof name === 'function' && ((characteristic instanceof name) || (name.UUID === characteristic.UUID))) {
            return characteristic;
        }
    }
    if (typeof name === 'function')  {
        for (index in this.optionalCharacteristics) {
            characteristic = this.optionalCharacteristics[index];
            if ((characteristic instanceof name) || (name.UUID === characteristic.UUID)) {
                return this.addCharacteristic(name);
            }
        }
    }
};

module.exports = {
  Service: Service
};