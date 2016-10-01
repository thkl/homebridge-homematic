function checknpmversion(pck,callback) {
 var exec = require('child_process').exec;
 var cmd = 'npm view '+pck;
 exec(cmd, function(error, stdout, stderr) {
   var regex = /latest:*.'([0-9].*)'/
   var result = stdout.match(regex);
   callback(result[1]);
 });
}

checknpmversion("homebridge-punt",function(version){
 console.log(version);
});