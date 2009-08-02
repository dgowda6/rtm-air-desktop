var viewport = null;
var toolbar = null;
var grid = null;
var gridStore = null;
var topPanel = null;
var searchField = null;
var searchPanel = null;
var addField = null;
var statusbar = null;
var trackPanel = null;
var trackProgress = null;

var gridTpl = new Ext.XTemplate('<tpl for="."><div class="x-task-item x-task-priority{priority}"><div class="x-task-title x-task-title-{overdue}">{title}</div><div class="x-task-tags">{tags}</div><div class="x-task-due">{due_text}</div><div style="clear: both;"></div></div></tpl>');

var parseQuickAdd = function(data){
	var splitWith = function(data, delim){
		var arr = [];
		while(data.indexOf(delim)!=-1){
			arr.push(data.substr(0, data.indexOf(delim)));
			data = data.substr(data.indexOf(delim));
			var lookFrom = delim.length;
			while(data.substr(lookFrom, delim.length)==delim)
				lookFrom += delim.length;
			arr.push(data.substr(0, lookFrom));
			data = data.substr(lookFrom);
		}
		if(data.length>0)
			arr.push(data);
		return arr;
	}
	var specWord = function(word){
		if(word.indexOf('#')==0)
			return true;
		if(word.indexOf('@')==0)
			return true;
		if(word.indexOf('>')==0)
			return true;
		if(word.indexOf('!')==0)
			return true;
		if(word.indexOf('~')==0)
			return true;
		if(word.toLowerCase()=='every' || word.toLowerCase()=='after')
			return true;
		return false;
	};

	var words = splitWith(data, ' ');
	var wordAt = 0;
	var result = {
		tags: [],
		location: settings.get('defaultLocation') || 0,
		list: settings.get('defaultList') || 0,
		repeat: '',
		estimate: '',
		text: '',
		priority: 4
	};

//	air.trace('|'+words.join('|')+'|');
	while(wordAt<words.length){
		var word = words[wordAt];
		if(specWord(word)){
			if(word.indexOf('#')==0){
				//tag
				if(word.length==1 && wordAt+2<words.length){
					wordAt += 2;
					word = '#'+words[wordAt];
				}
				result.tags.push(word.substr(1));
				wordAt += 2;
				continue;
			}
			if(word.indexOf('!')==0){
				//tag
				if(word.length==1 && wordAt+2<words.length){
					wordAt += 2;
					word = '!'+words[wordAt];
				}
				result.priority = parseInt(word.substr(1));
				wordAt += 2;
				continue;
			}
			if(word.indexOf('@')==0){
				//location
				if(word.length==1 && wordAt+2<words.length){
					wordAt += 2;
					word = '@'+words[wordAt];
				}
				var location = word.substr(1).toLowerCase();
				for(var i = 0; i<conn.locations.length; i++){
					if(conn.locations[i].name.toLowerCase().indexOf(location)==0){
						result.location = conn.locations[i].id;
						break;
					}
				}
				wordAt += 2;
				continue;
			}
			if(word.indexOf('>')==0){
				//list
				if(word.length==1 && wordAt+2<words.length){
					wordAt += 2;
					word = '>'+words[wordAt];
				}
				var list = word.substr(1).toLowerCase();
				for(var i = 0; i<conn.lists.length; i++){
					if(conn.lists[i].name.toLowerCase().indexOf(list)==0){
						result.list = conn.lists[i].id;
						break;
					}
				}
				wordAt += 2;
				continue;
			}
			var isEstimate = word.indexOf('~')==0;
			if(isEstimate)
				word = word.substr(1);
			//Search next not spec word
			var index = 1;
			var str = word;
			while(wordAt+index<words.length && !specWord(words[wordAt+index])){
				str += words[wordAt+index];
				index++;
			}
			if(isEstimate)
				result.estimate = str.trim();
			else
				result.repeat = str;
			wordAt = wordAt+index;
			continue;
		}
		result.text += word;
		wordAt++;
	}
	result.text = result.text.trim();
	air.trace('Parse result:'+result.text, 'list:'+result.list, 'location:'+result.location, 'estimate:'+result.estimate, 'repeat:'+result.repeat, 'tags:'+result.tags.join(','), 'priority:'+result.priority);
	return result;
}

var reloadByTimer = function(){
	if(conn.authToken && !conn.active())
		reloadList();
}

var reloadList = function(){
	conn.getList(settings.get('showList'), function(list){
		gridStore.removeAll();
		var now = new Date();
		for(var i = 0; i<list.length; i++){
			var task = list[i];
			if(task.completed)
				continue;
			var due = '&nbsp;';
			var overdue = 0;
			if(task.due){
				due = task.due.format('n/j');
				var days = daysBetween(task.due, now);
//				air.trace('days: ', task.due, now, days, task.name);
				if(days>=0 && days<7){
					if(days==0){
						overdue = 1;
						if(task.hasTime)
							due = '';
						else
							due = 'Today';
					}else{
						if(days==1)
							due = 'Tomorrow';
						else
							due = task.due.format('l');
					}
				}
				if(days<0)
					overdue = 2;
				if(task.hasTime)
					due += ' '+task.due.format('g:i a');
			}else{

			}
			if(task.estimate)
				due += ' ~'+task.estimate.replace(/hours|hour|hrs/ig,'hr').replace(/minutes|minute|mins/ig, 'min');
			var dueDate = task.due? task.due: Date.parseDate(now.format('Y-m-d')+'T23:59:00Z', 'Y-m-d\\TH:i:s\\Z');
			dueDate = dueDate.add(Date.SECOND, task.priority);
			gridStore.add(new Ext.data.Record({
				id: task.id,
				title: task.name,
				due: dueDate,
				due_text: due,
				priority: task.priority,
				tags: task.tags.join(', '),
				overdue: overdue
			}));
//			air.trace('Adding', task.name, dueDate);
		}
		gridStore.sort('due', 'ASC');
	}, function(){
		gridStore.removeAll();
	});
}

var showFloatWin = function(task){
	var win = openNewWindow({
		id: 'float',
		src: '../html/float.html',
		stateful: true,
//		chrome: 'none',
		type: 'utility',
		onTop: true,
		width: 400,
		height: 250
	});
}

Ext.onReady(function(){
	var mainWin = new Ext.air.NativeWindow({
		id: 'mainWindow',
		instance: window.nativeWindow,
		minimizeToTray: true,
		trayTip: 'RTM Desktop',
		width: settings.get('mainWidth') || defaultState.mainWidth,
		height: settings.get('mainHeight') || defaultState.mainHeight
	});
	conn.authToken = settings.get('authToken') || '';
	air.trace('Token from settings: '+conn.authToken);

	addField = new Ext.form.TextField({
		width: '100%',
		emptyText: 'Enter task and hit Enter',
		enableKeyEvents: true
	});
	addField.on('keydown', function(item, event){
		if(event.getKey()==Ext.EventObject.ENTER && item.getValue()){
			var data = parseQuickAdd(item.getValue());
			if(data.text){
				conn.createTimeline(function(tl){
					conn.addTask(tl, data.text, data.list, function(task){
						if(data.estimate)
							conn.setEstimate(tl, task, data.estimate);
						if(data.tags.length>0)
							conn.setTags(tl, task, data.tags.join(','));
						if(data.location)
							conn.setLocation(tl, task, data.location);
						if(data.priority<4)
							conn.setPriority(tl, task, data.priority);
						if(data.repeat)
							conn.setRecurrence(tl, task, data.repeat);
						item.setValue('');
						item.focus(false, 10);
						reloadList();
					});
				});
			}
		}
	});
	var completeBtn = new Ext.Button({
		text: 'Complete',
		handler: function(){
			if(selectionModel.getCount()>0){
				var id = selectionModel.getSelected().get('id');
				for (var i = 0; i < conn.list.length; i++) {
					var task = conn.list[i];
					if(task.id==id){
						air.trace('Completing task', task.name);
						conn.createTimeline(function(tl){
							conn.complete(tl, task);
							gridStore.remove(selectionModel.getSelected());
						});
					}
				};
			}
		},
		enabled: false
	});
	toolbar = new Ext.Toolbar({
		region: 'north',
		items: [
			{
				text: 'Reload',
				handler: function(){
					reloadList();
				}
			}, completeBtn, '->',{
				text: 'Settings',
				handler: function(){
					openNewWindow({
						id: 'settings',
						src: 'settings.html'
					});
				}
			},{
				text: 'Search',
				handler: function(){
					searchPanel.toggleCollapse(false);
					viewport.syncSize();
				}
			}
		]
	});

	statusbar = new Ext.ux.StatusBar({
		defaultText: 'Idle'
	});

	searchField = new Ext.form.TextField({
		columnWidth: 1,
		emptyText: 'Enter search query and hit Enter',
		enableKeyEvents: true
	});

	saveSearch = new Ext.Button({
		text: 'Save',
		region: 'east',
		anchor: 'right',
		autoHeight: true
	});

	searchPanel = new Ext.Panel({
		layout: 'column',
		border: false,
//		collapsed: true,
		autoHeight: true,
		autoWidth: true,
		items: [searchField, saveSearch]
	});

	topPanel = new Ext.Panel({
		tbar: toolbar,
		border: false,
		region: 'north',
		autoHeight: true,
//		autoWidth: true,
		items: [addField, searchPanel]
	});
	
	trackProgress = new Ext.ProgressBar({
	});
	
	trackPanel = new Ext.Panel({
		region: 'south',
		autoHeight: true,
		layout: 'fit',
		items: [trackProgress]		
	});
	gridStore = new Ext.data.ArrayStore({
		fields: ['id', 'title', 'tags', 'due', 'due_text', 'repeated', 'estimate', 'priority', 'exec_time', 'exec_time_text', 'overdue'],
		sortInfo: {
			field: 'due',
			direction: 'DESC'
		},
		idIndex: 0 // id for each record will be the first element
	});

	var selectionModel = new Ext.grid.RowSelectionModel({singleSelect:true});
	selectionModel.on('selectionchange', function(){
//		air.trace('Selected rows: ',selectionModel.getCount());
//		completeBtn.setDisabled(selectionModel.getCount()==0);
		if(selectionModel.getCount()>0){
			//Row here
		}else{
			//No rows selected
		}
	});

	grid = new Ext.grid.GridPanel({
		store: gridStore,
//		tbar: searchToolbar,
		region: 'center',
		columns: [
			{id: 'title', header: 'Task', tpl: gridTpl, xtype: 'templatecolumn', dataIndex: 'id'}
		],
		autoExpandColumn: 'title',
		enableHdMenu: false,
		sm: selectionModel
	});
	grid.on('rowdblclick', showFloatWin);
	mainWin.on('move', function(event){
//		air.trace('x: '+event.afterBounds.x+', '+event.afterBounds.y);
		settings.set('mainLeft', event.afterBounds.x);
		settings.set('mainTop', event.afterBounds.y);
	});
	mainWin.on('resize', function(event){
//		air.trace('width: '+event.afterBounds.width+', '+event.afterBounds.height);
		settings.set('mainWidth', event.afterBounds.width);
		settings.set('mainHeight', event.afterBounds.height);
	});
	mainWin.on('closing', function(event){
		settings.saveState();
		air.NativeApplication.nativeApplication.exit(0);
	});
	mainWin.moveTo(settings.get('mainLeft') || defaultState.mainLeft, settings.get('mainTop') || defaultState.mainTop);
	mainWin.show();
	mainWin.instance.activate();
	timer.init();
	air.NativeApplication.nativeApplication.addEventListener(air.Event.USER_IDLE, timer.userIdle);
	air.NativeApplication.nativeApplication.addEventListener(air.Event.USER_PRESENT, timer.userActive);
	Ext.TaskMgr.start({
		run: timer.oneSecond,
		interval: 1000
	});
	Ext.TaskMgr.start({
		run: reloadByTimer,
		interval: 5*60*1000
	});
	viewport = new Ext.Viewport({
		layout: 'fit',
		items:{
			bbar: statusbar,
			layout: 'border',
			items: [grid, topPanel, trackPanel]
		}
	});
	searchPanel.toggleCollapse(false);
	conn.start = function(){
		statusbar.showBusy('Loading...');
		toolbar.setDisabled(true);
		grid.setDisabled(true);
		topPanel.setDisabled(true);
	}

	conn.end = function(code, message){
		if(message)
			air.trace('We got an error!', code, message);
		//else
			statusbar.clearStatus({
				useDefaults: true
			});
		toolbar.setDisabled(false);
		grid.setDisabled(false);
		topPanel.setDisabled(false);
	}

	conn.checkToken(function(xml){
		conn.getLists();
		conn.getLocations();
		reloadList();
	}, function(code, message){
		air.trace('Check failed, '+code+':'+message);
	});
});


var timer = {};
timer.TYPE_USER_ACTIVE = 0;
timer.TYPE_USER_OVERWORK = 1;
timer.TYPE_USER_BREAK_YEARLY = 2;
timer.TYPE_USER_BREAK_OVERWORK = 3;
timer.TYPE_USER_BREAK_WAIT_WORK = 4;
timer.workSeconds = 0;
timer.idleSeconds = 0;
timer.trackWorkTime = false;
timer.action = timer.TYPE_USER_ACTIVE;
timer.odd = false;
timer.isUserActive = true;

timer.updateProgress = function(value, seconds, text){
	var mins = Math.floor(seconds/60);
	var secs = seconds-mins*60;
	trackProgress.updateProgress(value, text+mins+':'+(secs<10?'0':'')+secs);
//	air.trace('update', value, text+mins+':'+(secs<10?'0':'')+secs);
}

timer.oneSecond = function(){	
	if(!timer.trackWorkTime)
		return;
	if(timer.action==timer.TYPE_USER_ACTIVE || timer.action==timer.TYPE_USER_OVERWORK){
		//user active
		timer.workSeconds++;
		if(timer.workSeconds>timer.workTimePeriod)
			timer.action = timer.TYPE_USER_OVERWORK;
	}else{
		//user idle
		timer.idleSeconds++;
		if(timer.idleSeconds>=timer.restPeriod){//Rest too much
			if(timer.action==timer.TYPE_USER_BREAK_OVERWORK && timer.isUserActive){
				//When user took a rest after overwork and rest is over
				timer.action = timer.TYPE_USER_ACTIVE;
				timer.workSeconds = 0;
			}else{
				//Just wait for activity from user
				timer.action = timer.TYPE_USER_BREAK_WAIT_WORK;				
			}
		}
	}
	timer.showProgress();
};

timer.showProgress = function(){
	switch(timer.action){
		case timer.TYPE_USER_ACTIVE:
			timer.updateProgress(timer.workSeconds/timer.workTimePeriod, timer.workSeconds, 'Work time: ');
			break;
		case timer.TYPE_USER_OVERWORK:
			timer.updateProgress(timer.odd? 0: 1, timer.workSeconds-timer.workTimePeriod, 'Overwork time: -');
			timer.odd = !timer.odd;
			break;
		case timer.TYPE_USER_BREAK_OVERWORK:
		case timer.TYPE_USER_BREAK_YEARLY:
			timer.updateProgress(timer.idleSeconds/timer.restPeriod, timer.idleSeconds, 'Rest time: ');
			break;
		case timer.TYPE_USER_BREAK_WAIT_WORK:
			timer.updateProgress(timer.odd? 0: 1, timer.idleSeconds, 'Rest time: ');
			timer.odd = !timer.odd;
			break;
	}	
}

timer.init = function(){
	var prevTrack = this.trackWorkTime || false;
	this.trackWorkTime = settings.get('trackWorkTime') || false;
	this.workTimePeriod = (settings.get('workTimePeriod') || 50)*60;
	this.restPeriod = (settings.get('restPeriod') || 10)*60;
	air.NativeApplication.nativeApplication.idleThreshold = settings.get('inactivityDelay') || 30;
	if(!this.trackWorkTime){
		trackProgress.updateProgress(0, 'Disabled');
		trackPanel.setDisabled(true);
	}else{
		if(!prevTrack){
			this.action = this.TYPE_USER_ACTIVE;
			this.workSeconds = 0;
		}
		trackPanel.setDisabled(false);
		this.userActive();
	}
};

timer.userActive = function(){
	air.trace('userActive');
	timer.isUserActive = true;
	if(!timer.trackWorkTime)
		return;
	if(timer.action!=timer.TYPE_USER_ACTIVE && timer.action!=timer.TYPE_USER_OVERWORK){
		if(timer.action==timer.TYPE_USER_BREAK_YEARLY){
			timer.action = timer.TYPE_USER_ACTIVE;
		}else{
			if(timer.action==timer.TYPE_USER_BREAK_WAIT_WORK){
				timer.action = timer.TYPE_USER_ACTIVE;
				timer.workSeconds = 0;				
			}
		}
		timer.showProgress();
	}
};

timer.userIdle = function(){
	air.trace('userIdle');
	timer.isUserActive = false;
	if(!timer.trackWorkTime)
		return;
	if(timer.action==timer.TYPE_USER_ACTIVE || timer.action==timer.TYPE_USER_OVERWORK){
		timer.idleSeconds = settings.get('inactivityDelay') || 30;
		if(timer.workSeconds>timer.workTimePeriod)
			timer.action = timer.TYPE_USER_BREAK_OVERWORK;
		else
			timer.action = timer.TYPE_USER_BREAK_YEARLY;
		timer.showProgress();
	}
}
