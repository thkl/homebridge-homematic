'use strict';

const request = require('request');
const HomeMaticRPC = require('./HomeMaticRPC.js').HomeMaticRPC;
const HomeMaticRegaRequest = require('./HomeMaticRegaRequest.js').HomeMaticRegaRequest;
const HomeMaticChannelLoader = require('./HomeMaticChannelLoader.js').HomeMaticChannelLoader;

const inherits = require('util').inherits;
const path = require('path');
const fs = require('fs');
let uuid;
let localCache;
let localPath;
let Service, Characteristic;
let _homebridge;

module.exports = function (homebridge) {
	_homebridge = homebridge;
	uuid = homebridge.hap.uuid;
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerPlatform('homebridge-homematic', 'HomeMatic', HomeMaticPlatform);
	localCache = path.join(homebridge.user.storagePath(), 'ccu.json');
	localPath = homebridge.user.storagePath()
};

function HomeMaticPlatform(log, config) {
	this.log = log;
	this.uuid = uuid;
	this.homebridge = _homebridge;
	
	this.log('Homematic Plugin Version ' + this.getVersion());
	this.log('Plugin by thkl  https://github.com/thkl');
	this.log('Homematic is a registered trademark of the EQ-3 AG');
	this.log('Please report any issues to https://github.com/thkl/homebridge-homematic/issues');

	this.ccuIP = config.ccu_ip;
	this.log('will connect to your ccu at %s', this.ccuIP);

	const test = new HomeMaticRegaRequest(this.log, this.ccuIP).script('Write(\'PONG\');', data => {
		log.info('if %s is PONG CCU is alive', data);
	});

	this.filter_device = config.filter_device;
	this.filter_channel = config.filter_channel;

	this.outlets = config.outlets;
	this.iosworkaround = config.ios10;
	this.doors = config.doors;
	this.windows = config.windows;
	this.variables = config.variables;
	this.programs = config.programs;
	this.subsection = config.subsection;
	this.localCache = config.lcache;
	this.vuc = config.variable_update_trigger_channel;

	if ((this.subsection == undefined) || (this.subsection == '')) {
		this.log.warn('Uuhhh. There is no value for the key subsection in config.json.');
		this.log.warn('There will be no devices fetched from your ccu.');
		this.log.warn('Please create a subsection and put in all the channels,');
		this.log.warn('you want to import into homekit. Then add the name of that');
		this.log.warn('section into your config.json as "subsection"="....".');
		return;
	}

	this.sendQueue = [];
	this.timer = 0;

	this.foundAccessories = [];
	this.adressesToQuery = [];
	this.config = config;

	let port = config.local_port;
	if (port == undefined) {
		port = 9090;
	}

	this.xmlrpc = new HomeMaticRPC(this.log, this.ccuIP, port, 0, this);
	this.xmlrpc.init();

	if (config.enable_wired != undefined) {
	  this.xmlrpcwired = new HomeMaticRPC(this.log, this.ccuIP, port + 1, 1, this);
  	  this.xmlrpcwired.init();
	}

	if (config.enable_hmip != undefined) {
	  this.xmlrpchmip = new HomeMaticRPC(this.log, this.ccuIP, port + 2, 2, this);
  	  this.xmlrpchmip.init();
	}

	const that = this;

	process.on('SIGINT', () => {
		if (that.xmlrpc.stopping) {
			return;
		}
		that.xmlrpc.stopping = true;
		that.xmlrpc.stop();
		if (that.xmlrpcwired != undefined) {
      	that.xmlrpcwired.stop();
		}

		if (that.xmlrpchmip != undefined) {
      	that.xmlrpchmip.stop();
		}

		setTimeout(process.exit(0), 2000);
	});

	process.on('SIGTERM', () => {
		if (that.xmlrpc.stopping) {
			return;
		}
		that.xmlrpc.stopping = true;
		that.xmlrpc.stop();
		if (that.xmlrpcwired != undefined) {
      	that.xmlrpcwired.stop();
		}
		if (that.xmlrpchmip != undefined) {
      	that.xmlrpchmip.stop();
		}

		setTimeout(process.exit(0), 2000);
	});
}

HomeMaticPlatform.prototype.accessories = function (callback) {
	const that = this;
	that.foundAccessories = [];

	if ((this.subsection == undefined) || (this.subsection == '')) {
		callback(that.foundAccessories);
		return;
	}

	this.log('Fetching Homematic devices...');
	const internalconfig = this.internalConfig();
	const channelLoader = new HomeMaticChannelLoader(this.log);
	channelLoader.localPath = localPath
	channelLoader.init(this.config.services);

	let script = 'string sDeviceId;string sChannelId;boolean df = true;Write(\'{"devices":[\');foreach(sDeviceId, root.Devices().EnumIDs()){object oDevice = dom.GetObject(sDeviceId);if(oDevice){var oInterface = dom.GetObject(oDevice.Interface());if(df) {df = false;} else { Write(\',\');}Write(\'{\');Write(\'"id": "\' # sDeviceId # \'",\');Write(\'"name": "\' # oDevice.Name() # \'",\');Write(\'"address": "\' # oDevice.Address() # \'",\');Write(\'"type": "\' # oDevice.HssType() # \'",\');Write(\'"channels": [\');boolean bcf = true;foreach(sChannelId, oDevice.Channels().EnumIDs()){object oChannel = dom.GetObject(sChannelId);if(bcf) {bcf = false;} else {Write(\',\');}Write(\'{\');Write(\'"cId": \' # sChannelId # \',\');Write(\'"name": "\' # oChannel.Name() # \'",\');if(oInterface){Write(\'"intf": "\' # oInterface.Name() 	# \'",\');Write(\'"address": "\' # oInterface.Name() #\'.\'\ # oChannel.Address() # \'",\');}Write(\'"type": "\' # oChannel.HssType() # \'",\');Write(\'"access": "\' # oChannel.UserAccessRights(iulOtherThanAdmin)# \'"\');Write(\'}\');}Write(\']}\');}}Write(\']\');';

	script += 'var s = dom.GetObject("';
	script += this.subsection;
	script += '");string cid;boolean sdf = true;if (s) {Write(\',"subsection":[\');foreach(cid, s.EnumUsedIDs()){ ';
	script += ' if(sdf) {sdf = false;}';
	script += ' else { Write(\',\');}Write(cid);}Write(\']\');}';

	script += 'Write(\'\}\'\);';

	var regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP);
	regarequest.timeout = this.config.ccufetchtimeout || 120;
	regarequest.script(script, data => {
	  let json;
	  that.log.info('Fetch Response');
	  //that.log.debug(data);
		if (data != undefined) {
	     try {
	      // Read Json
	      json = JSON.parse(data);
		if ((json != undefined) && (json.devices != undefined)) {
			// Seems to be valid json
			if (localCache != undefined) {
				fs.writeFile(localCache, data, err => {
				  if (err) {
					  that.log.warn('Cannot cache ccu data ', err);
				  }
					  that.log('will cache ccu response ...');
    	      	});
    	     }
		}
		 } catch (e) {
  				that.log.warn('Unable to parse live ccu data. Will try cache if there is one. If you want to know what, start homebridge in debug mode -> DEBUG=* homebridge -D');
  				that.log.debug('JSON Error %s for Data %s', e, data);
		 }
		}

      // Check if we got valid json from ccu
		if ((json == undefined) && (localCache != undefined)) {
      // Try to load Data

			try {
	    fs.accessSync(localCache, fs.F_OK);
    	  // Try to load Data
				data = fs.readFileSync(localCache).toString();
				if (data != undefined) {
					try {
						json = JSON.parse(data);
						that.log('loaded ccu data from local cache ... WARNING: your mileage may vary');
					} catch (e) {
  					that.log.warn('Unable to parse cached ccu data. giving up');
		  			}
  	    		}
  	    
			} catch (e) {
  				that.log.warn('Unable to load cached ccu data. giving up');
			}
		
		} // End json is not here but try local cache

		if ((json != undefined) && (json.devices !== undefined)) {
			json.devices.map(device => {
				const cfg = that.deviceInfo(internalconfig, device.type);

				let isFiltered = false;

				if ((that.filter_device !== undefined) && (that.filter_device.indexOf(device.address) > -1)) {
					isFiltered = true;
				} else {
					isFiltered = false;
				}

				if ((device.channels !== undefined) && (!isFiltered)) {
					device.channels.map(ch => {
						let isChannelFiltered = false;
						let isSubsectionSelected = false;
			  // If we have a subsection list check if the channel is here
			  if (json.subsection != undefined) {
			   const cin = (json.subsection.indexOf(ch.cId) > -1);
			    // If not .. set filter flag
			    isChannelFiltered = !cin;
			    isSubsectionSelected = cin;
			  }

			  if ((cfg != undefined) && (cfg.filter != undefined) && (cfg.filter.indexOf(ch.type) > -1)) {
			  	isChannelFiltered = true;
			  }

						if ((that.filter_channel !== undefined) && (that.filter_channel.indexOf(ch.address) > -1)) {
							isChannelFiltered = true;
						}

              // That.log('name', ch.name, ' -> address:', ch.address);
						if ((ch.address !== undefined) && (!isChannelFiltered)) {
                  // Switch found
                  // Check if marked as Outlet or Door
							let special;
							if ((that.outlets != undefined) && (that.outlets.indexOf(ch.address) > -1)) {
								special = 'OUTLET';
							}
							if ((that.doors != undefined) && (that.doors.indexOf(ch.address) > -1)) {
								special = 'DOOR';
							}
							if ((that.windows != undefined) && (that.windows.indexOf(ch.address) > -1)) {
								special = 'WINDOW';
							}

                  // Check if VIRTUAL KEY is Set as Variable Trigger
							if ((that.vuc != undefined) && (ch.type == 'VIRTUAL_KEY') && (ch.name == that.vuc)) {
								that.log('Channel ' + that.vuc + ' added as Variable Update Trigger');
	    			 ch.type = 'VARIABLE_UPDATE_TRIGGER';
                	 channelLoader.loadChannelService(that.foundAccessories, 'VARIABLE_UPDATE_TRIGGER', ch, that, that.variables,  cfg, 255 ,Service, Characteristic);
							} else {
                	 channelLoader.loadChannelService(that.foundAccessories, device.type, ch, that, special, cfg, ch.access, Service, Characteristic);
							}
						} else {
                // Channel is in the filter
						}
					});
				} else {
					that.log(device.name + ' has no channels or is filtered');
				}
			}); // End Mapping all JSON Data

			if (that.programs != undefined) {
				that.programs.map(program => {
					const prgtype = '';

					if (that.iosworkaround == undefined) {
						that.log('Program ' + program + ' added as Program_Launcher');

						var ch = {};
						var cfg = {};
						ch.type = 'PROGRAM_LAUNCHER';
						ch.address = program;
						ch.name = program;
						channelLoader.loadChannelService(that.foundAccessories, 'PROGRAM_LAUNCHER', ch, that, 'PROGRAM', cfg, 255, Service, Characteristic);
					} else {
	            var cfg = that.deviceInfo(internalconfig, '');
						that.log('Program ' + program + ' added as SWITCH cause of IOS 10');
						var ch = {};
						ch.type = 'SWITCH';
						ch.address = program;
						ch.name = program;
						channelLoader.loadChannelService(that.foundAccessories, 'SWITCH', ch, that, 'PROGRAM', cfg, 255, Service, Characteristic);
					}
				});
			} // End Mapping Programs

			// Add Optional Variables
			if (that.variables != undefined) {
				that.variables.map(variable => {
					const ch = {};
					const cfg = {};
					ch.type = 'VARIABLE';
					ch.address = variable;
					ch.name = variable;
					ch.intf = 'Variable';
					channelLoader.loadChannelService(that.foundAccessories, 'VARIABLE', ch, that,	'VARIABLE', cfg, 255, Service, Characteristic);
				});
			} // End Variables

			callback(that.foundAccessories);
		} else {
			callback(that.foundAccessories);
		}

		// Check number of devices
		const noD = that.foundAccessories.length;
		that.log('Number of mapped devices : ' + noD);
      	if (noD > 100) {
      	    that.log.warn('********************************************');
      	    that.log.warn('* You are using more than 100 HomeKit      *');
      	    that.log.warn('* devices behind a bridge. At this time    *');
      	    that.log.warn('* HomeKit only supports up to 100 devices. *');
      	    that.log.warn('* This may end up that iOS is not able to  *');
      	    that.log.warn('* connect to the bridge anymore.           *');
      	    that.log.warn('********************************************');
      	} else

      	if (noD > 90) {
      	    that.log.warn('You are using more than 90 HomeKit');
      	    that.log.warn('devices behind a bridge. At this time');
      	    that.log.warn('HomeKit only supports up to 100 devices.');
      	    that.log.warn('This is just a warning. Everything should');
      	    that.log.warn('work fine until you are below that 100.');
      	}
      	
	});

    // Version Check and autoupdate

	this.fetch_npmVersion('homebridge-homematic', npmVersion => {
		npmVersion = npmVersion.replace('\n', '');
		that.log('NPM %s vs Local %s', npmVersion, that.getVersion());
		if (npmVersion > that.getVersion()) {
			const autoupdate = that.config.autoupdate;
			const instpath = that.config.updatepath;
			if (autoupdate) {
	        let cmd;
	        if (autoupdate == 'global') {
		       cmd = 'sudo npm -g update homebridge-homematic';
	        }

	        if ((autoupdate == 'local') && (instpath)) {
		       cmd = 'cd ' + instpath + ';npm update homebridge-homematic';
	        }

	        if ((autoupdate == 'github') && (instpath)) {
		       cmd = 'cd ' + instpath + ';git pull';
	        }

	        if (cmd) {
			    const exec = require('child_process').exec;
		that.log.info('There is a new version. Autoupdate is set to %s, so we are updating ourself now .. this may take some seconds.', autoupdate);
		exec(cmd, (error, stdout, stderr) => {
			if (!error) {
				that.log.warn('A new version was installed recently. Please restart the homebridge process to complete the update');
				that.log.warn('Message from updater %s', stdout);
			} else {
				that.log.error('Error while updating.');
			}
		});
	        } else {
		that.log.error('Some autoupdate settings missed.');
	        }
			} else {
    	   that.log.warn('There is a new Version available. Please update with sudo npm -g update homebridge-homematic');
			}
		}
	});
	
};

HomeMaticPlatform.prototype.setValue = function (intf, channel, datapoint, value) {
	if (channel != undefined) {
		if (intf != undefined) {
			let rpc = false;

			if (intf == 'BidCos-RF') {
				rpc = true;
				this.xmlrpc.setValue(channel, datapoint, value);
				return;
    			}

			if (intf == 'BidCos-Wired') {
				rpc = true;
				if (this.xmlrpcwired != undefined) {
					this.xmlrpcwired.setValue(channel, datapoint, value);
				} else {
					// Send over Rega
					var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
					rega.setValue(channel, datapoint, value);
				}
				return;
    			}

			if (intf == 'HmIP-RF') {
				rpc = true;
				if (this.xmlrpchmip != undefined) {
					this.xmlrpchmip.setValue(channel, datapoint, value);
				} else {
					// Send over Rega
					var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
					rega.setValue(channel, datapoint, value);
				}
				return;
			}

			if (intf == 'Variable') {
				var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
				rega.setVariable(channel, value);
				rpc = true;
				return;
			}

				// Rega Fallback
			if (rpc == false) {
				var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
				rega.setValue(channel, datapoint, value);
			}
		} else {
			// Undefined Interface -> Rega should know how to deal with it
			var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
			rega.setValue(channel, datapoint, value);
		}
	}
};

HomeMaticPlatform.prototype.remoteSetValue = function (channel, datapoint, value) {
	 const that = this;
	 this.foundAccessories.map(accessory => {
		if ((accessory.adress == channel) || ((accessory.cadress != undefined) && (accessory.cadress == channel))) {
			accessory.event(channel,datapoint, value);
		}
	});
};

HomeMaticPlatform.prototype.setRegaValue = function (channel, datapoint, value) {
	const rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
	rega.setValue(channel, datapoint, value);
};

HomeMaticPlatform.prototype.sendRegaCommand = function (command, callback) {
	const rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
	const that = this;
	rega.script(command, data => {
		if (callback != undefined) {
		 callback(data);
		}
	});
};

HomeMaticPlatform.prototype.getValue = function (intf, channel, datapoint, callback) {
	if (channel != undefined) {
		if (intf != undefined) {
			let rpc = false;
			if (intf == 'BidCos-RF') {
				this.xmlrpc.getValue(channel, datapoint, callback);
				rpc = true;
				return;
			}

		 if (intf == 'BidCos-Wired') {
			 rpc = true;
		 	if (this.xmlrpcwired != undefined) {
		 	this.xmlrpcwired.getValue(channel, datapoint, callback);
		 } else {
		 // Send over Rega
		 var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
		 rega.getValue(channel, datapoint, callback);
     	 }
	 	 return;
    	}

			if (intf == 'HmIP-RF') {
				if (this.xmlrpchmip != undefined) {
					this.xmlrpchmip.getValue(channel, datapoint, callback);
				} else {
			// Send over Rega
					var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
					rega.getValue(channel, datapoint, callback);
				}
				return;
    	}

			if (intf == 'Variable') {
				var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
				rega.getVariable(channel, callback);
				rpc = true;
				return;
			}

		// Fallback to Rega
			if (rpc == false) {
		 	var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
				rega.getValue(channel, datapoint, callback);
			}
		} else {
		// Undefined Interface -> Rega should know how to deal with it
			var rega = new HomeMaticRegaRequest(this.log, this.ccuIP);
			rega.getValue(channel, datapoint, callback);
		}
	}
};

HomeMaticPlatform.prototype.prepareRequest = function (accessory, script) {
	const that = this;
	this.sendQueue.push(script);
	that.delayed(100);
};

HomeMaticPlatform.prototype.sendPreparedRequests = function () {
	const that = this;
	let script = 'var d;';
	this.sendQueue.map(command => {
		script += command;
	});
	this.sendQueue = [];
	const regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, data => {});
};

HomeMaticPlatform.prototype.sendRequest = function (accessory, script, callback) {
	const regarequest = new HomeMaticRegaRequest(this.log, this.ccuIP).script(script, data => {
		if (data !== undefined) {
			try {
				const json = JSON.parse(data);
				callback(json);
			} catch (err) {
				callback(undefined);
			}
		}
	});
};

HomeMaticPlatform.prototype.delayed = function (delay) {
	const timer = this.delayed[delay];
	if (timer) {
		this.log('removing old command');
		clearTimeout(timer);
	}

	const that = this;
	this.delayed[delay] = setTimeout(() => {
		clearTimeout(that.delayed[delay]);
		that.sendPreparedRequests();
	}, delay ? delay : 100);
	this.log('New Timer was set');
};

HomeMaticPlatform.prototype.deviceInfo = function (config, devicetype) {
	let cfg;
	if (config != undefined) {
		const di = config.deviceinfo;
		di.map(device => {
			if (device.type == devicetype) {
				cfg = device;
			}
		});
	}

	return cfg;
};

HomeMaticPlatform.prototype.internalConfig = function () {
	try {
		const config_path = path.join(__dirname, './internalconfig.json');
		const config = JSON.parse(fs.readFileSync(config_path));
		return config;
	} catch (err) {
		throw err;
	}

	return undefined;
};

HomeMaticPlatform.prototype.getVersion = function () {
	const pjPath = path.join(__dirname, './package.json');
	const pj = JSON.parse(fs.readFileSync(pjPath));
	return pj.version;
};

HomeMaticPlatform.prototype.fetch_npmVersion = function (pck, callback) {
	const exec = require('child_process').exec;
	const cmd = 'npm view ' + pck + ' version';
	exec(cmd, (error, stdout, stderr) => {
		let npm_version = stdout;
		npm_version = npm_version.replace('\n', '');
		callback(npm_version);
	});
};
