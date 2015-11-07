var http = require("http");


function HomeMaticRegaRequest(log, ccuip) {
  this.log = log;
  this.ccuIP = ccuip;
}

HomeMaticRegaRequest.prototype = {

  script: function(script, callback) {

    var post_options = {
      host: this.ccuIP,
      port: "80",
      path: "/tclrega.exe",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": script.length
      },
      timeout: 60
    };

    var post_req = http.request(post_options, function(res) {
      var data = "";
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
      callback("{}");
    });

    post_req.write(script);
    post_req.end();


  },

  getValue: function(channel, datapoint, callback) {
    var that = this;

    var script = "var d = dom.GetObject(\"" + channel + "." + datapoint + "\");if (d){Write(d.State());}";
    //that.log("Rega Request " + script);
    this.script(script, function(data) {
      //that.log("Rega Response " + data);
      if (data !== undefined) {
        callback(parseFloat(data));
      }
    });
  },

  setValue: function(channel, datapoint, value) {

    var script = "var d = dom.GetObject(\"" + channel + "." + datapoint + "\");if (d){d.State(\"" + value + "\");}";
    //this.log("Rega Request " + script);
    this.script(script, function(data) {

    });
  }
};

module.exports = {
  HomeMaticRegaRequest: HomeMaticRegaRequest
}

