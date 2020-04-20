'use strict'

var http = require('http')

function HomeMaticRegaRequest (log, ccuip) {
  this.log = log
  this.ccuIP = ccuip
  this.timeout = 120
}

HomeMaticRegaRequest.prototype = {

  script: function (script, callback) {
    var that = this

    // this.log.debug("RegaScript %s",script);

    var ls = script

    var postOptions = {
      host: this.ccuIP,
      port: '8181',
      path: '/tclrega.exe',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': script.length
      }
    }

    var postReq = http.request(postOptions, function (res) {
      var data = ''
      res.setEncoding('binary')

      res.on('data', function (chunk) {
        data += chunk.toString()
      })

      res.on('end', function () {
        var pos = data.lastIndexOf('<xml><exec>')
        var response = (data.substring(0, pos))
        callback(response)
      })
    })

    postReq.on('error', function (e) {
      that.log.error('Error ' + e + 'while executing rega script ' + ls)
      callback(undefined)
    })

    postReq.on('timeout', function (e) {
      that.log.error('timeout while executing rega script')
      postReq.destroy()
    })

    postReq.setTimeout(this.timeout * 1000)

    postReq.write(script)
    postReq.end()
  },

  getValue: function (channel, datapoint, callback) {
    var script = 'var d = dom.GetObject("' + channel + '.' + datapoint + '");if (d){Write(d.Value());}'
    this.script(script, function (data) {
      if (data !== undefined) {
        callback(data)
      }
    })
  },

  setValue: function (channel, datapoint, value) {
    // check explicitDouble
    if (typeof value === 'object') {
      let v = value['explicitDouble']
      if (v !== undefined) {
        value = v
      }
    }
    this.log.debug('Rega SetValue %s of %s.%s', value, channel, datapoint)
    var script = 'var d = dom.GetObject("' + channel + '.' + datapoint + '");if (d){d.State("' + value + '");}'
    this.script(script, function (data) {

    })
  },

  setVariable: function (channel, value) {
    var script = 'var d = dom.GetObject("' + channel + '");if (d){d.State("' + value + '");}'
    this.script(script, function (data) {

    })
  },

  getVariable: function (channel, callback) {
    var script = 'var d = dom.GetObject("' + channel + '");if (d){Write(d.State());}'
    this.script(script, function (data) {
      if (data !== undefined) {
        callback(data)
      }
    })
  },

  isInt: function (n) {
    return Number(n) === n && n % 1 === 0
  },

  isFloat: function (n) {
    return n === Number(n) && n % 1 !== 0
  }

}

module.exports = {
  HomeMaticRegaRequest: HomeMaticRegaRequest
}
