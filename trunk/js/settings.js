var opener = Ext.air.NativeWindow.getRootHtmlWindow();

var userButton = null;

var listsCombo = null;
var listsStore = null;

var showListCombo = null;
var showListStore = null;

var locationsCombo = null;
var locationsStore = null;

var showReminder = null;
var reminderMinutes = null;

var storeAsNote = null;
var storeAsEstimate = null;

var trackWorkTime = null;
var workTimePeriod = null;
var restPeriod = null;
var inactivityDelay = null;
var openPaused = null;
var updateMinutes = null;
var expandNotes = null;

Ext.onReady(function(){

	var tokenOk = function(user){
		userButton.setText(user.username+': remove permission');
//		air.trace('Saving token '+opener.conn.authToken);
		opener.settings.set('authToken', opener.conn.authToken);
		buttonStatus = 2;
		opener.conn.getLists(function(lists){
			listsStore.removeAll();
			showListStore.removeAll();
			listsStore.add(new Ext.data.Record({
				id: 0,
				text: 'No default list'
			}));
			for(var i = 0; i<lists.length; i++){
				showListStore.add(new Ext.data.Record({
					id: lists[i].id,
					text: lists[i].name
				}));
				if(lists[i].smart)
					continue;
				listsStore.add(new Ext.data.Record({
					id: lists[i].id,
					text: lists[i].name
				}));

			}
			listsCombo.setValue(opener.settings.get('defaultList') || 0);
			var listNow = opener.settings.get('showList') || 0;
			if(showListStore.find('id', listNow))
				showListCombo.setValue(listNow);
			else
				showListCombo.setValue(showListStore.getAt(0).get('id'));
			mask.hide();
		}, function(){
			mask.hide();
		});
		opener.conn.getLocations(function(locs){
			locationsStore.removeAll();
			locationsStore.add(new Ext.data.Record({
				id: 0,
				text: 'No default location'
			}));
			for(var i = 0; i<locs.length; i++){
				locationsStore.add(new Ext.data.Record({
					id: locs[i].id,
					text: locs[i].name+(locs[i].address?
										' ('+locs[i].address+')':
										'')
				}));
			}
			locationsCombo.setValue(opener.settings.get('defaultLocation') || 0);
			mask.hide();
		}, function(){
			mask.hide();
		});

	};

	var buttonStatus = -1;
	userButton = new Ext.Button({
		text: 'Checking...',
		fieldLabel: 'User permission status',
		width: '100%',
		handler: function(){
			if(buttonStatus==2){
				opener.conn.authToken = '';
				opener.settings.set('authToken', '');
				buttonStatus = 0;
				userButton.setText('Grant permission');
			}else{
				if(buttonStatus==0){
					//Start permission
					mask.show();
					opener.conn.getFrob(function(frob){
						air.navigateToURL(new air.URLRequest(opener.conn.buildURL({
							perms: 'delete',
							frob: frob
						}, null, 'http://www.rememberthemilk.com/services/auth/')));
						mask.hide();
						buttonStatus = 1;
						userButton.setText('Confirm permission');
					}, function(code, msg){
						mask.hide();
						showError(msg);
						//Show error here
					});
				}else{
					mask.show();
					opener.conn.getToken(function(user){
						opener.conn.getSettings(function(s){
							opener.dateFormat = s.dateformat;
							opener.timeFormat = s.timeformat;
						});
						tokenOk(user);
					}, function(code, msg){
						mask.hide();
						showError(msg);
						//Show error
					});
					//Confirm
				}
			}
		}
	});

	listsStore = new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'id',
            'text'
        ]
	});
	listsCombo = new Ext.form.ComboBox({
		store: listsStore,
		editable: false,
		triggerAction: 'all',
		mode: 'local',
		valueField: 'id',
		displayField: 'text',
		valueNotFoundText: 'Invalid value',
		fieldLabel: 'Default list for new tasks'
	});

	showListStore = new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'id',
            'text'
        ]
	});
	showListCombo = new Ext.form.ComboBox({
		store: showListStore,
		editable: false,
		triggerAction: 'all',
		mode: 'local',
		valueField: 'id',
		displayField: 'text',
		valueNotFoundText: 'Invalid value',
		fieldLabel: 'Display list'
	});

	locationsStore = new Ext.data.ArrayStore({
        id: 0,
        fields: [
            'id',
            'text'
        ]
	});

	locationsCombo = new Ext.form.ComboBox({
		store: locationsStore,
		editable: false,
		triggerAction: 'all',
		mode: 'local',
		valueField: 'id',
		displayField: 'text',
		valueNotFoundText: 'Invalid value',
		fieldLabel: 'Default location for new tasks'
	});

	updateMinutes = new Ext.form.NumberField({
		minValue: 1,
		maxValue: 240,
		fieldLabel: 'Update list interval, in minutes',
		increment: 1,
		value: opener.settings.get('updateMinutes') || 15
	});

	reminderMinutes = new Ext.form.NumberField({
		minValue: 1,
		maxValue: 120,
		fieldLabel: 'Minutes before the task is due',
		increment: 1,
		value: opener.settings.get('reminderMinutes') || 5
	});
	showReminder = new Ext.form.Checkbox({
		boxLabel: 'Show reminder',
		disabled: true
	});
	showReminder.on('check', function(ch, state){
		reminderMinutes.setDisabled(!state);
	});
	showReminder.setValue(opener.settings.get('showReminder'));

	reminderMinutes.setDisabled(!opener.settings.get('showReminder'));

	storeAsEstimate = new Ext.form.Checkbox({
		boxLabel: 'Save task execution time in "Time estimate" field',
		checked: opener.settings.get('storeAsEstimate') || true
	});

	storeAsNote = new Ext.form.Checkbox({
		boxLabel: 'Save task execution time as a note',
		checked: opener.settings.get('storeAsNote') || false
	});


	var trackWorkTimeChanged = function(checked){
		workTimePeriod.setDisabled(!checked);
		restPeriod.setDisabled(!checked);
//		inactivityDelay.setDisabled(!checked);
	}

	trackWorkTime = new Ext.form.Checkbox({
		boxLabel: 'Track work time/rest time',
		checked: opener.settings.get('trackWorkTime') || false,
		handler: function(item, checked){
			trackWorkTimeChanged(checked);
		}
	});

	workTimePeriod = new Ext.form.NumberField({
		minValue: 1,
		maxValue: 240,
		fieldLabel: 'Work period, in minutes',
		increment: 1,
		value: opener.settings.get('workTimePeriod') || 50
	});

	restPeriod = new Ext.form.NumberField({
		minValue: 1,
		maxValue: 30,
		fieldLabel: 'Rest period, in minutes',
		increment: 1,
		value: opener.settings.get('restPeriod') || 10
	});

	inactivityDelay = new Ext.form.NumberField({
		minValue: 1,
		maxValue: 240,
		fieldLabel: 'Inactivity detection timeout, in seconds',
		increment: 1,
		value: opener.settings.get('inactivityDelay') || 30
	});

	openPaused = new Ext.form.Checkbox({
		boxLabel: 'Open task in floating win paused',
		checked: opener.settings.get('openPaused') || false
	});
	expandNotes = new Ext.form.Checkbox({
		boxLabel: 'Auto expand notes in floating win',
		checked: opener.settings.get('expandNotes') || false
	});
//	air.trace('trackWorkTime: '+trackWorkTime.getValue());
	if(!opener.settings.get('trackWorkTime')){
		trackWorkTimeChanged(false);
	}

	var form = new Ext.form.FormPanel({
		frame: 'true',
		labelWidth: 200,
		defaults:{
		anchor: '100%'
		},
		items:[
			userButton, updateMinutes, showListCombo, listsCombo, locationsCombo, showReminder, reminderMinutes,
			storeAsEstimate, storeAsNote,
			trackWorkTime, workTimePeriod, restPeriod, inactivityDelay, openPaused, expandNotes
		],
		buttons:[
			{
				text: 'Ok',
				handler: function(){
					if(opener.conn.active())
						return;

					opener.settings.set('defaultList', listsCombo.getValue());
					opener.settings.set('updateMinutes', updateMinutes.getValue());
					opener.settings.set('showList', showListCombo.getValue());
					opener.settings.set('defaultLocation', locationsCombo.getValue());

					opener.settings.set('showReminder', showReminder.getValue());
					opener.settings.set('reminderMinutes', reminderMinutes.getValue());

					opener.settings.set('storeAsNote', storeAsNote.getValue());
					opener.settings.set('storeAsEstimate', storeAsEstimate.getValue());

					opener.settings.set('trackWorkTime', trackWorkTime.getValue());
					opener.settings.set('workTimePeriod', workTimePeriod.getValue());
					opener.settings.set('restPeriod', restPeriod.getValue());
					opener.settings.set('inactivityDelay', inactivityDelay.getValue());
					opener.settings.set('openPaused', openPaused.getValue());
					opener.settings.set('expandNotes', expandNotes.getValue());

					window.nativeWindow.close();
					opener.updateTask.interval = (updateMinutes.getValue() || 15)*60*1000;
					opener.currentList = showListCombo.getValue();
					opener.conn.listsUpdated(opener.conn.lists);
					opener.reloadList();
					opener.timer.init();
				}
			},{
				text: 'Cancel',
				handler: function(){
					if(opener.conn.active())
						return;
					window.nativeWindow.close();
				}
			}
		]
	});
	window.nativeWindow.activate();
	new Ext.Viewport({
		layout: 'fit',
		items: form
	});
	var mask = new Ext.LoadMask(Ext.getBody(), {msg:'Please wait...'});
	mask.show();
	opener.conn.checkToken(function(user){
		tokenOk(user);
	}, function(){
		buttonStatus = 0;
		userButton.setText('Grant permission');
		mask.hide();
	});
});
