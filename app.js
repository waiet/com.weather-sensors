'use strict'

const Homey = require('homey')

const protocols = require('protocols')
const utils = require('utils')

class WeatherSensorApp extends Homey.App {

	// Register all needed signals with Homey
	async registerSignals(setting) {
		for (let s in protocols) {
			this.log('protocol  ' +  s)
			let signal = new protocols[s];
			this.protocols[s] = { id: s, name: signal.getName(), hint: signal.getHint(this.getLocale())};
			if (setting && setting[s]) {
				if (setting[s].watching && this.signals[s] === undefined) {
					// Register signal defitinion with Homey
					let gs = signal.getSignal();
					try {
						this.signals[s] = this.homey.rf.getSignal433(gs.def);
				    } catch (error) {
						utils.debug('Signal', s, '; error', error);
					}
					if(this.signals[s]){
						await this.signals[s].enableRX();

					    // on a payload event		
					    //this.signals[s].on("payload", function (payload, first) {
						//	this.log(`received data: ${payload} isRepetition ${!first}`);
	  				    //});
  
	  				    // on a command event
	  				    this.signals[s].on("cmd", function (cmdId, first) {
						    this.log(`received command: ${cmdId} isRepetition: ${!first}`);
						});

						utils.debug('Signal', s, 'registered.');
						 // Register data receive event
						this.signals[s].on('payload', function (payload, first) {
							this.log('payload');
				 			signal.debug('Received payload for', signal.getName());
				 			signal.debug(payload.length, payload);
				 			if (signal.parser(payload)) {
				 				this.log('signal.parser')
				 				if (typeof this.update === 'function') {
				 					this.log('update')
				 					this.update(signal);
				 					let stats = signal.getStatistics();
				 					// Only send needed statistics
				 					this.homey.api.realtime('stats_update', { protocol: s, stats: { total: stats.total, ok: stats.ok } });
				 				}
				 			}
				 		})
					}
				} else if (!setting[s].watching && this.signals[s] !== undefined) {
					delete this.signals[s]
					utils.debug('Signal', s, 'unregistered.')
				}
			}
		}
	}

	async onInit() {
		this.log('WeatherSensorApp is running...')
		this.signals = {}
		this.protocols = {}

		// Read app settings for protocol selection
		let setting = this.homey.settings.get('protocols');

		if (setting == null || Object.keys(setting).length === 0  || true) {
			// No setting? Register all signals
			setting = {}
			let protocolNames = Object.keys(protocols)
			for (let sig in protocolNames) {
				let s = protocolNames[sig]
				setting[s] = { watching: true }
			}
			this.homey.settings.set('protocols', setting)
		}
		
		this.registerSignals(setting)

		// Catch setting changes
		this.homey.settings.on('set', key => {
			if (key === 'protocols') {
				let setting = this.homey.settings.get('protocols')
				if (setting != null) {
					this.registerSignals(setting)
				}
			}
		})

	}

	getLocale(){
		return this.homey.i18n.getLanguage() == 'nl' ? 'nl' : 'en'
	}

	// API exported functions
	getSensors() {
		let driver = this.homey.drivers.getDriver('sensor')
		if (driver !== undefined && typeof driver.getAllSensors === 'function') {
			return driver.getAllSensors()
		}
	}

	getProtocols() {
		return this.protocols;
	}

	getStatistics() {
		let result = {}
		let ws = utils.WeatherSignal.get()
		for (let sig in ws) {
			let signal = utils.WeatherSignal.get(ws[sig])
			result[ws[sig]] = {
				signal: signal.getName(),
				enabled: this.signals[ws[sig]] != null,
				stats: signal.getStatistics()
			}
		}
		return result
	}
}

module.exports = WeatherSensorApp;
