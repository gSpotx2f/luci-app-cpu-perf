'use strict';
'require form';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

const btnStyleEnabled  = 'btn cbi-button-save';
const btnStyleDisabled = 'btn cbi-button-reset';

return view.extend({
	appName   : 'cpu-perf',
	initStatus: null,

	callCpuPerf: rpc.declare({
		object: 'luci.cpu-perf',
		method: 'getCpuPerf',
		expect: { '': {} }
	}),

	callInitStatus: rpc.declare({
		object: 'luci',
		method: 'getInitList',
		params: [ 'name' ],
		expect: { '': {} }
	}),

	callInitAction: rpc.declare({
		object: 'luci',
		method: 'setInitAction',
		params: [ 'name', 'action' ],
		expect: { result: false }
	}),

	getInitStatus: function() {
		return this.callInitStatus(this.appName).then(res => {
			if(res) {
				return res[this.appName].enabled;
			} else {
				throw _('Command failed');
			}
		}).catch(e => {
			ui.addNotification(null,
				E('p', _('Failed to get %s init status: %s').format(this.appName, e)));
		});
	},

	handleServiceAction: function(action) {
		return this.callInitAction(this.appName, action).then(success => {
			if(!success) {
				throw _('Command failed');
			};
			return true;
		}).catch(e => {
			ui.addNotification(null,
				E('p', _('Service action failed "%s %s": %s').format(this.appName, action, e)));
		});
	},

	serviceRestart: function(ev) {
		poll.stop();
		return this.handleServiceAction('restart').then(() => {
			poll.start();
		});
	},

	updateCpuPerfData: function() {
		this.callCpuPerf().then((data) => {
			for(let i of Object.values(data)) {
				document.getElementById('cpu' + i.number + 'number').textContent   =
					_('CPU') + ' ' + i.number;
				document.getElementById('cpu' + i.number + 'curFreq').textContent  =
					(i.sCurFreq) ? this.freqFormat(i.sCurFreq) : this.freqFormat(i.curFreq);
				document.getElementById('cpu' + i.number + 'minFreq').textContent  =
					(i.sMinFreq) ? this.freqFormat(i.sMinFreq) : this.freqFormat(i.minFreq)
				document.getElementById('cpu' + i.number + 'maxFreq').textContent  =
					(i.sMaxFreq) ? this.freqFormat(i.sMaxFreq) : this.freqFormat(i.maxFreq);
				document.getElementById('cpu' + i.number + 'governor').textContent =
					i.governor || '-';
			};
		}).catch(e => {});
	},

	freqFormat : function(freq) {
		if(!freq) {
			return '-';
		};
		return (freq >= 1e6) ?
			(freq / 1e6) + ' ' + _('GHz')
		:
			(freq / 1e3) + ' ' + _('MHz');
	},

	CBIBlockPerf: form.Value.extend({
		__name__ : 'CBI.BlockPerf',

		__init__ : function(map, section, ctx, perfData) {
			this.map      = map;
			this.section  = section;
			this.ctx      = ctx;
			this.perfData = perfData;
			this.optional = true;
			this.rmempty  = true;
		},

		renderWidget: function(section_id, option_index, cfgvalue) {
			let cpuTableTitles = [
				_('CPU'),
				_('Current frequency'),
				_('Minimum frequency'),
				_('Maximum frequency'),
				_('Scaling governor'),
			];

			let cpuTable = E('table', { 'class': 'table' },
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th left' }, cpuTableTitles[0]),
					E('th', { 'class': 'th center' }, cpuTableTitles[1]),
					E('th', { 'class': 'th center' }, cpuTableTitles[2]),
					E('th', { 'class': 'th center' }, cpuTableTitles[3]),
					E('th', { 'class': 'th center' }, cpuTableTitles[4]),
				])
			);

			if(this.perfData) {
				for(let i of Object.values(this.perfData)) {
					cpuTable.append(
						E('tr', { 'class': 'tr' }, [
							E('td', {
								'id': 'cpu' + i.number + 'number',
								'class': 'td left',
								'data-title': cpuTableTitles[0],
							}, _('CPU') + ' ' + i.number),
							E('td', {
								'id': 'cpu' + i.number + 'curFreq',
								'class': 'td center',
								'data-title': cpuTableTitles[1],
							}, (i.sCurFreq) ?
									this.ctx.freqFormat(i.sCurFreq)
								:
									this.ctx.freqFormat(i.curFreq)
							),
							E('td', {
								'id': 'cpu' + i.number + 'minFreq',
								'class': 'td center',
								'data-title': cpuTableTitles[2],
							}, (i.sMinFreq) ?
									this.ctx.freqFormat(i.sMinFreq)
								:
									this.ctx.freqFormat(i.minFreq)
							),
							E('td', {
								'id': 'cpu' + i.number + 'maxFreq',
								'class': 'td center',
								'data-title': cpuTableTitles[3],
							}, (i.sMaxFreq) ?
									this.ctx.freqFormat(i.sMaxFreq)
								:
									this.ctx.freqFormat(i.maxFreq)
							),
							E('td', {
								'id': 'cpu' + i.number + 'governor',
								'class': 'td center',
								'data-title': cpuTableTitles[4],
							}, i.governor || '-'),
						])
					);
				};
			};

			if(cpuTable.childNodes.length === 1){
				cpuTable.append(
					E('tr', { 'class': 'tr placeholder' },
						E('td', { 'class': 'td' },
							E('em', {}, _('No performance data...'))
						)
					)
				);
			};
			return cpuTable;
		},
	}),

	CBIBlockInitButton: form.Value.extend({
		__name__ : 'CBI.BlockInitButton',

		__init__ : function(map, section, ctx) {
			this.map      = map;
			this.section  = section;
			this.ctx      = ctx;
			this.optional = true;
			this.rmempty  = true;
		},

		renderWidget: function(section_id, option_index, cfgvalue) {
			this.ctx.initButton = E('button', {
				'class': (!this.ctx.initStatus) ? btnStyleDisabled : btnStyleEnabled,
				'click': ui.createHandlerFn(this, () => {
					return this.ctx.handleServiceAction(
						(!this.ctx.initStatus) ? 'enable' : 'disable'
					).then(success => {
						if(!success) {
							return;
						};
						if(!this.ctx.initStatus) {
							this.ctx.initButton.textContent = _('Enabled');
							this.ctx.initButton.className   = btnStyleEnabled;
							this.ctx.initStatus             = true;
						} else {
							this.ctx.initButton.textContent = _('Disabled');
							this.ctx.initButton.className   = btnStyleDisabled;
							this.ctx.initStatus             = false;
						};
					});
				}),
			}, (!this.ctx.initStatus) ? _('Disabled') : _('Enabled'));

			return E( [
				E('label', { 'class': 'cbi-value-title' },
					_('Run at startup')
				),
				E('div', { 'class': 'cbi-value-field' },
					this.ctx.initButton
				),
			]);
		},
	}),

	freqValidate: function(section_id, value, slave_elem, max=false) {
		let slaveValue = slave_elem.formvalue(section_id);
		if(value === '' || slaveValue === '') {
			return true;
		};
		value      = Number(value);
		slaveValue = Number(slaveValue);
		if((max && value >= slaveValue) || (!max && value <= slaveValue)) {
			return true;
		};
		return `${_('Frequency value must not be')} ${max ? _('lower') : _('higher')} ${_('than the')} "${slave_elem.title}"!`;
	},

	load: function() {
		return Promise.all([
			this.getInitStatus(),
			this.callCpuPerf(),
			uci.load(this.appName),
		]).catch(e => {
			ui.addNotification(null, E('p', _('An error has occurred') + ': %s'.format(e.message)));
		});
	},

	render: function(data) {
		if(!data) {
			return;
		};

		this.initStatus      = data[0];
		let cpuPerfDataArray = data[1];

		let s, o;
		let m = new form.Map(this.appName,
			_('CPU Performance'),
			_('CPU performance information and management.'));

		/* Status */

		s = m.section(form.NamedSection, 'config', 'main');
		o = s.option(this.CBIBlockPerf, this, cpuPerfDataArray);

		/* Performance managment */

		s = m.section(form.NamedSection, 'config', 'main',
			_("Performance managment"));

		// enabled
		o = s.option(form.Flag, 'enabled',
			_('Enable'));
		o.rmempty = false;

		// init button
		o = s.option(this.CBIBlockInitButton, this);

		/* CPUs settings */

		let sections = uci.sections(this.appName, 'cpu');

		if(sections.length == 0) {
			s = m.section(form.NamedSection, 'config', 'main');
			o = s.option(form.DummyValue, '_dummy');
			o.rawhtml = true;
			o.default = '<label class="cbi-value-title"></label><div class="cbi-value-field"><em>' +
				_('CPU performance scaling not available...') +
				'</em></div>';
		} else {
			for(let section of sections) {
				let sectionName = section['.name'];
				let cpuNum      = Number(sectionName.replace('cpu', ''));
				let o;
				let s = m.section(form.NamedSection, sectionName, 'cpu',
					_('CPU') + ' ' + cpuNum);

				if(cpuPerfDataArray[cpuNum]) {
					if(cpuPerfDataArray[cpuNum].sAvailGovernors &&
					   cpuPerfDataArray[cpuNum].sAvailGovernors.length > 0) {

						// scaling_governor
						o = s.option(form.ListValue,
							'scaling_governor', _('Scaling governor'),
							_('Scaling governors implement algorithms to estimate the required CPU capacity.')
						);
						o.rmempty  = true;
						o.optional = true;
						cpuPerfDataArray[cpuNum].sAvailGovernors.forEach(e => o.value(e));
					};

					if(cpuPerfDataArray[cpuNum].sAvailFreqs &&
					   cpuPerfDataArray[cpuNum].sAvailFreqs.length > 0) {
						let availFreqs = cpuPerfDataArray[cpuNum].sAvailFreqs.map(e =>
							[ e, this.freqFormat(e) ]
						);

						// scaling_min_freq
						let minFreq = s.option(form.ListValue,
							'scaling_min_freq', _('Minimum scaling frequency'),
							_('Minimum frequency the CPU is allowed to be running.') +
								' ('  + _('default value:') + ' <code>' +
								this.freqFormat(cpuPerfDataArray[cpuNum].minFreq) + '</code>).'
						);
						minFreq.rmempty  = true;
						minFreq.optional = true;
						availFreqs.forEach(e => minFreq.value(e[0], e[1]));

						// scaling_max_freq
						let maxFreq = s.option(form.ListValue,
							'scaling_max_freq', _('Maximum scaling frequency'),
							_('Maximum frequency the CPU is allowed to be running.') +
								' ('  + _('default value:') + ' <code>' +
								this.freqFormat(cpuPerfDataArray[cpuNum].maxFreq) + '</code>).'
						);
						maxFreq.rmempty  = true;
						maxFreq.optional = true;
						availFreqs.forEach(e => maxFreq.value(e[0], e[1]));

						minFreq.validate = L.bind(
							function(section_id, value) {
								return this.freqValidate(section_id, value, maxFreq, false);
							},
							this
						);
						maxFreq.validate = L.bind(
							function(section_id, value) {
								return this.freqValidate(section_id, value, minFreq, true);
							},
							this
						);
					};
				};

				if(!cpuPerfDataArray[cpuNum] ||
				   !(cpuPerfDataArray[cpuNum].sAvailGovernors &&
				   cpuPerfDataArray[cpuNum].sAvailGovernors.length > 0) &&
				   !(cpuPerfDataArray[cpuNum].sAvailFreqs &&
				   cpuPerfDataArray[cpuNum].sAvailFreqs.length > 0)) {
					o         = s.option(form.DummyValue, '_dummy');
					o.rawhtml = true;
					o.default = '<label class="cbi-value-title"></label><div class="cbi-value-field"><em>' +
						_('Performance scaling not available for this CPU...') +
						'</em></div>';
				};
			};
		};

		let mapPromise = m.render();
		mapPromise.then(node => {
			node.classList.add('fade-in');
			poll.add(L.bind(this.updateCpuPerfData, this));
		});
		return mapPromise;
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(() => {
			ui.changes.apply(mode == '0');
			window.setTimeout(() => this.serviceRestart(), 3000);
		});
	},
});
