var http = require("http");


function HomeMaticRegaRequest(log, ccuip) {
  this.log = log;
  this.ccuIP = ccuip;
  this.timeout = 60;
}

HomeMaticRegaRequest.prototype = {

  script: function(script, callback) {
    var that = this;
    
    var ls = script;
    
    var post_options = {
      host: this.ccuIP,
      port: "8181",
      path: "/tclrega.exe",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": script.length
      },
    };

    var post_req = http.request(post_options, function(res) {
      var data = "";
      var that = this;
      
      res.setEncoding("binary");
      
      res.on("data", function(chunk) {
        data += chunk.toString();
      });
      
      res.on("end", function() {
        var pos = data.lastIndexOf("<xml><exec>");
        var response = (data.substring(0, pos));
        callback(response);
      });

      
    });


    post_req.on("error", function(e) {
	    that.log("Error " + e + "while executing rega script " + ls);
        callback(undefined);
    });

    post_req.on("timeout", function(e) {
	    that.log("timeout while executing rega script");
        callback(undefined);
    });
    
	post_req.setTimeout(this.timeout * 1000);
    post_req.write(script);
    post_req.end();
  },

  getValue: function(channel, datapoint, callback) {
    var that = this;

    var script = "var d = dom.GetObject(\"" + channel + "." + datapoint + "\");if (d){Write(d.State());}";
    this.script(script, function(data) {
      if (data !== undefined) {
        callback(data);
      } 
    });
  },

  setValue: function(channel, datapoint, value) {

    var script = "var d = dom.GetObject(\"" + channel + "." + datapoint + "\");if (d){d.State(\"" + value + "\");}";
    this.script(script, function(data) {

    });
  },

  setVariable: function(channel, value) {

    var script = "var d = dom.GetObject(\"" + channel + "\");if (d){d.State(\"" + value + "\");}";
    this.script(script, function(data) {

    });
  },


  getVariable: function(channel, callback) {
    var that = this;
    var script = "var d = dom.GetObject(\"" + channel + "\");if (d){Write(d.State());}";
    //this.log("RegaScript %s",script);
    this.script(script, function(data) {
      if (data !== undefined) {
       // that.log.debug("Result is %s",data);
        callback(data);
      } 
    });
  },
    
  isInt: function(n){
    return Number(n) === n && n % 1 === 0;
  },

  isFloat: function(n){
    return n === Number(n) && n % 1 !== 0;
  }

};

module.exports = {
  HomeMaticRegaRequest: HomeMaticRegaRequest
}

