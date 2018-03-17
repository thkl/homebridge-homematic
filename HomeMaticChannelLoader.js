'use strict';
const path = require('path');
const fs = require('fs');
const rootClazzPath = path.join(__dirname,'ChannelServices','HomeKitGenericService');
var HomeKitGenericService = require(rootClazzPath);

var HomeMaticChannelLoader = function (log) {
	this.log = log;
}

HomeMaticChannelLoader.prototype.init = function(customServices) {
	var that = this;
	this.config = this.internalConfig(customServices);
}



HomeMaticChannelLoader.prototype.loadChannelService = function(list, deviceType, channel, platform, special, cfg, access, Service, Characteristic) {

	var that = this;
	var channelType = channel.type;
	var log = platform.log;
	var id = channel.id;
	var name = channel.name;
	var adress = channel.address;
	var intf = channel.intf;
	this.platform = platform
	// try to load device:type
	var serviceclass;
	var options;

	var sv = this.getServiceClass(deviceType+':' + channelType);
	serviceclass = sv['class']
	if (sv['options'] == undefined) {
		options = this.getOptions(deviceType+':' + channelType);
	} else {
		options = sv['options']
	}


	if (serviceclass == undefined) {
		// not found try to find channeltype
		sv = this.getServiceClass(channelType);
		serviceclass = sv['class']
		if (sv['options'] == undefined) {
			options = this.getOptions(channelType);
		} else {
			options = sv['options']
		}
	}

	if (serviceclass == undefined) {
		// not found try to find devicetype
		sv = this.getServiceClass(deviceType);
		serviceclass = sv['class']
		if (sv['options'] == undefined) {
			options = this.getOptions(deviceType);
		} else {
			options = sv['options']
		}
	}

	if (serviceclass != undefined) {

		var service = this.loadClass(serviceclass);
		if (service) { // require ('./ChannelServices/' + serviceclass);
		// add Options
		if (options != undefined) {
			if (cfg != undefined) {
				cfg.push.apply(cfg, options);
			} else {
				cfg = options;
			}
		}
		if (cfg==undefined) {
			cfg = {};
		}

		cfg['interface'] = channel.intf;

		// Replace Chars in name https://github.com/thkl/homebridge-homematic/issues/56

		name = name.replace(/[.:#_()-]/g,' ');
		that.log.debug('service for %s:%s is %s' , deviceType, channelType, serviceclass);

		let cfgOptions = this.getConfigOptions(deviceType + ':' + channelType)
		if (cfgOptions != undefined) {
			// Add config.json options
			Object.keys(cfgOptions).forEach(function (key) {
				cfg[key] = cfgOptions[key]
			})
		}

		var accessory = new service(log, platform, id, name, channelType, adress, special, cfg, Service, Characteristic, deviceType);
		accessory.setReadOnly(access != 255)
		list.push(accessory);
	}
} else {
	that.log.warn('There is no service for ' + deviceType+':' + channelType );
}
};


HomeMaticChannelLoader.prototype.loadClass = function(serviceclass) {

	if (fs.existsSync(path.join(__dirname,'ChannelServices',serviceclass+'.js'))) {
		this.log.debug('Load BuildIn Service Class %s',serviceclass)
		return require(path.join(__dirname,'ChannelServices',serviceclass))
	}

	if (fs.existsSync(path.join(this.localPath,serviceclass+'.js'))) {
		this.log.debug('Load Custom Service Class %s',serviceclass)
		return require(path.join(this.localPath,serviceclass))
	}

	this.log.warn('No class found in %s or %s',path.join(__dirname,'ChannelServices',serviceclass+'.js'),path.join(this.localPath,serviceclass+'.js'))

	return undefined;
}


HomeMaticChannelLoader.prototype.getOptions = function(type) {
	var that = this;
	var options = undefined;
	if (this.config != undefined) {
		var ci = this.config['channelconfig'];
		ci.map(function(service) {
			if (service['type']==type) {
				options = service['options'];
			}
		});
	}


	return options;
}

// load options from config.json

HomeMaticChannelLoader.prototype.getConfigOptions = function(type) {
	this.log.debug('Check config for %s',type)
	var options = undefined;
	let coptions = this.platform.config[type]
	if (coptions) {
		options = coptions
	}
	return options
}

HomeMaticChannelLoader.prototype.getServiceClass = function(type) {
	var that = this;
	var serviceclass = undefined;
	var serviceoptions = undefined;

	if (this.config != undefined) {
		var ci = this.config['channelconfig'];
		ci.map(function(service) {
			if (service['type']==type) {
				serviceclass = service['service']
				serviceoptions = service['options']
			}
		});
	}
	return {'class':serviceclass,'options':serviceoptions};
}


HomeMaticChannelLoader.prototype.internalConfig = function(customServices) {

	try {
		var config_path = path.join(__dirname, './ChannelServices/channel_config.json');
		var config = JSON.parse(fs.readFileSync(config_path));
		if (customServices != undefined) {
			customServices.map(function(service) {
				config['channelconfig'].push(service);
			});
		}


		return config;
	}

	catch (err) {
		this.log.warn('Internal Channel config has errors, or was not found. You may ceck the file ChannelService/channel_config.json');
		throw err;
	}

	return undefined;
};


module.exports = {
	HomeMaticChannelLoader : HomeMaticChannelLoader
}
