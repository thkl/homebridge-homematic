#!/usr/bin/env node
'use strict'

const HomeMaticRegaRequest = require('../HomeMaticRegaRequest.js').HomeMaticRegaRequest
const program = require('commander')
const log = require('../test/lib/logger')._system
const fs = require('fs')
const path = require('path')

program
  .version('0.1.0')
  .usage('[options]')
  .option('-A, --address [type]', 'set device address to fetch')
  .option('-C, --ccuip [type]', 'set ccuip ')
  .option('-P, --ccuport [type]', 'set ccuport ')
  .parse(process.argv)

console.info('')
console.info('CCU Device Fetcher')
console.info('==================')
console.info('2018 by thkl')
console.info('this will generate device test data for homebridge-homematic test cases')
console.info('')

if (typeof program.ccuip === 'undefined') {
  console.error('no ccuip given! --help for help')
  process.exit(1)
}

if (typeof program.address === 'undefined') {
  console.error('no device address given!  --help for help')
  process.exit(1)
}

if (typeof program.ccuport === 'undefined') {
  console.warn('no device port given. Using 8181 by default.  --help for additional information')
  program.ccuport = '8181';
}

let name = 'TA1'
var script = 'string sDeviceId;string sChannelId;boolean df = true;'
script = script + 'integer zl = 1000;integer czl=0;'
script = script + "Write('{\"devices\":[');"
script = script + "object oDevice = dom.GetObject('%s');if(oDevice){var oInterface = dom.GetObject(oDevice.Interface());if(df) {df = false;} else { Write(',');}"
script = script + "Write('{');Write('\"id\": \"' # zl # '\",');zl=zl+1;Write('\"name\": \"" + name + "\",');Write('\"address\": \"' # oDevice.Address() # '\",');"
script = script + "Write('\"type\": \"' # oDevice.HssType() # '\",');Write('\"channels\": [');boolean bcf = true;foreach(sChannelId, oDevice.Channels().EnumIDs()){"
script = script + "object oChannel = dom.GetObject(sChannelId);if(bcf) {bcf = false;} else {Write(',');}Write('{');"
script = script + "Write('\"cId\": ' # zl # ',');zl=zl+1;Write('\"name\": \"" + name + "_'#czl#'\",');"
script = script + "if(oInterface){Write('\"intf\": \"' # oInterface.Name() # '\",');Write('\"address\": \"' # oInterface.Name() #'.' # oChannel.Address() # '\",');}"
script = script + "Write('\"type\": \"' # oChannel.HssType() # '\",');Write('\"access\": \"' # oChannel.UserAccessRights(iulOtherThanAdmin)# '\"');"
script = script + "Write('}');}Write(']}');}"
script = script + "Write('],\"subsection\":[1000]}');"

script = script.replace('%s', program.address)

console.info('Query CCU at %s:%s', program.ccuip, program.ccuport)

let request = new HomeMaticRegaRequest(log, program.ccuip, program.ccuport)
request.script(script, data => {
  // parse This
  console.info('Resonse from ccu is %s bytes', data.length)
  console.info('Rebuilding JSON')
  let jData = JSON.parse(data)
  let device = jData.devices[0]
  if (device !== undefined) {
    let adr = device.address
    let dtype = device.type
    device.address = 'ADR1234567890'
    device.channels.map(function (channel) {
      channel.address = channel.address.replace(adr, 'ADR1234567890')
    })
    let fileName = path.join(__dirname, '..', 'test', 'lib', 'data', 'data_test_') + dtype + '.json'
    if (fs.existsSync(fileName)) {
      console.info('moving old file into trash')
      fs.unlink(fileName)
    }
    var buffer = JSON.stringify(jData, null, 2)
    fs.writeFileSync(fileName, buffer)
    console.info('written to %s', fileName)
  } else {
    console.info('No data for %s', program.address)
  }
})
