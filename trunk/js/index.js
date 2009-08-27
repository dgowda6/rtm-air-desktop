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
var titlePrefix = 'YaR Desktop: ';
var selectionModel = null;
var searchString = null;
var listButton = null;
var currentList = null;
var updateTask = null;
var dateFormat = '';
var timeFormat = '';

var gridTpl = new Ext.XTemplate('<tpl for="."><div class="x-task-item x-task-priority{priority}"><div class="x-task-timer x-task-timer-odd-{timer_odd}">{timer}</div><div class="x-task-title x-task-title-{overdue} x-task-title-completed-{completed}">{title}</div><div style="clear: both;"></div><div class="x-task-tags">{tags}</div><div class="x-task-due">{due_text}</div><div style="clear: both;"></div></div></tpl>');

var findInGrid = function(taskID){
	for(var i = 0; i<gridStore.getCount(); i++){
		var task = gridStore.getAt(i);
		if(task.get('id')==taskID)
			return task;
	}
	return null;
}
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

//	log('|'+words.join('|')+'|');
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
//	log('Parse result:'+result.text, 'list:'+result.list, 'location:'+result.location, 'estimate:'+result.estimate, 'repeat:'+result.repeat, 'tags:'+result.tags.join(','), 'priority:'+result.priority);
	return result;
}

var reloadByTimer = function(){
	if(conn.authToken && !conn.active())
		reloadList();
}

var reloadList = function(){
	var prevID = null;
	if(selectionModel.getCount()>0)
		prevID = selectionModel.getSelected().get('id');
	window.nativeWindow.title = titlePrefix+'Loading...';
	var l = {
		id: null,
		name: 'Default list'
	};
	for(var i in conn.lists){
		if(conn.lists[i].id==currentList)
			l = conn.lists[i];
	}

	conn.getList(searchString? null: l, searchString, function(list){
		window.nativeWindow.title = titlePrefix+(searchString? 'Search results': l.name);
		gridStore.removeAll();
		var now = new Date();
		for(var i = 0; i<list.length; i++){
			var task = list[i];
			if(task.deleted)
				continue;
			var due = '&nbsp;';
			var overdue = 0;
			if(task.due){
				due = task.due.format(dateFormat);

				var days = daysBetween(task.due, now);
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
					due += ' '+task.due.format(timeFormat);
				task.due_text = due;
			}else{

			}
			if(task.estimate)
				due += ' ~'+task.estimate.replace(/hours|hour|hrs/ig,'hr').replace(/minutes|minute|mins/ig, 'min');
			var dueDate = task.due? task.due: Date.parseDate(now.format('Y-m-d')+'T23:59:00Z', 'Y-m-d\\TH:i:s\\Z');
			dueDate = dueDate.add(Date.SECOND, task.priority);
			gridStore.add(new Ext.data.Record({
				id: task.id,
				series_id: task.series_id,
				title: escapeHTML(task.name),
				due: dueDate,
				due_text: due,
				completed: task.completed? 1: 0,
				priority: task.priority,
				tags: task.tags.join(', '),
				overdue: overdue
			}));
//			log('Adding', task.name, dueDate);
		}
		gridStore.sort('due', 'ASC');
		if(prevID){
			selectionModel.selectRecords([findInGrid(prevID)]);
		}
	}, function(){
		gridStore.removeAll();
	}, function(){
		window.nativeWindow.title = titlePrefix+'Error!';
	});
}

var addNote = function(note, win){
	var panel = new win.window.Ext.Panel({
		forceLayout: true,
		border: false,
		bodyCssClass: 'x-note-body',
		title: escapeHTML(note.title) || 'Untitled',
		html: escapeHTML(note.body),
		tools: [
			{
				id: 'minus',
				handler: function(e, tool, panel){
//					log('Removing note', panel.noteID);
					if(!confirm('Delete note?'))
						return;
					conn.createTimeline(function(tl){
						conn.deleteNote(tl, conn.getTaskFromList(timer.displayTask), panel.note, function(){
							win.window.notesPanel.remove(panel);
							win.window.notesPanel.doLayout();
						})
					})
				}
			}
		],
		autoHeight: true,
		width: '100%',
		cls: 'x-task-note'
	});
	panel.note = note;
	panel.noteID = note.id;
	win.window.notesPanel.add(panel);
	win.window.notesPanel.doLayout();
	if(panel.body)
		panel.body.on('dblclick', function(){
			win.window.addEditNote(this, window);
		}, panel);
	else{
		log('body isn\'t ready');
	}
}

var showFloatWin = function(task){
	var win = openNewWindow({
		id: 'float',
		src: '../html/float.html',
		stateful: true,
		chrome: 'none',
		transparent: true,
		type: 'lightweight',
		onTop: true,
		width: 400,
		height: 160,
		afterOpen: function(win, newWin){
//			log('Window reactivated', task.name, task.id, win.window.titleDiv.dom.innerHTML);
			win.nativeWindow.alwaysInFront = false;
			if(settings.get('floatOnTop'))
				win.nativeWindow.alwaysInFront = true;
			if(newWin || timer.displayTask!=task.get('id')){
				timer.pauseTask(timer.displayTask);
			}
			timer.displayTask = task.get('id');
			var t = timer.startTask(task.get('id'));
			if(!timer.trackWorkTime){
				win.window.trackProgress.updateProgress(0, 'Disabled');
				win.window.trackProgress.setDisabled(true);
			}
			timer.showProgress();
			win.window.titleDiv.dom.innerHTML = task.get('title');
			win.window.tagsDiv.dom.innerHTML = task.get('tags');
			win.window.dueDiv.dom.innerHTML = task.get('due_text');
			win.window.pauseBtn.toggle(t.paused, true);
			win.window.noPauseBtn.toggle(t.background, true);
			win.window.timerDiv.dom.innerHTML = timer.secondsToString(t.seconds);
			var t = conn.getTaskFromList(task.get('id'));
			var loc = '';
			if(t){
				win.window.notesDiv.setVisible(t.notes.length>0);
				win.window.repeatDiv.setVisible(t.repeat);
				for(var i = 0; i<conn.locations.length; i++){
					if(conn.locations[i].id==t.location_id){
						win.window.locationURL = 'http://maps.google.com/?ll='+conn.locations[i].latitude+','+conn.locations[i].longitude+'&z='+conn.locations[i].zoom;
						loc = conn.locations[i].name;
					}
				}
				win.window.notesPanel.removeAll();
				var panelWidth = settings.get('notesPanelWidth') || 180;
				var collapsed = win.window.notesPanel.collapsed;
				var needCollapse = false;
				if(t.notes.length>0){
					needCollapse = true;
					if(settings.get('expandNotes') || !collapsed)
						needCollapse = false;
					win.window.notesPanel.expand(false);
				}else{
					win.window.notesPanel.collapse(false);
				}
				for(var i = 0; i<t.notes.length; i++){
					var note = t.notes[i];
					addNote(note, win);
				}
				if(needCollapse)
					win.window.notesPanel.collapse(false);
			}
			win.window.locationLink.dom.innerHTML = loc;
		}
	});

}

var showSettingsWin = function(){
	openNewWindow({
		id: 'settings',
		width: 560,
		height: 540,
		stateful: true,
		src: 'settings.html'
	});
};

var secondsToEstimate = function(seconds){
	var secs = seconds;
	var estString = '';
	var hours = Math.floor(secs/3600);
	secs -= hours*3600;
	var mins = Math.round(secs/60);
//	log('completeTask:', hours, mins, secs, seconds);
	if(mins==0 && hours==0)
		mins = 1;
	if(mins>10 || hours>0){
		mins = 5*Math.round(mins/5);
	}
	if(mins==60){
		hours++;
		mins = 0;
	}
	if(hours>0)
		estString = hours+' hr ';
	if(mins>0)
		estString += mins+' min';
//	log('completeTask:', hours, mins, estString);
	return estString.trim();
}

var completeTask = function(taskID){
	var task = findInGrid(taskID);
	var t = conn.getTaskFromList(taskID);
	if(!task || !t)
		return;
	var timerTask = timer.getTask(taskID);
	var estString = secondsToEstimate(timerTask.seconds);
	conn.createTimeline(function(tl){
		if(t.completed){
			conn.uncomplete(tl, t, function(){
				reloadList();
				timer.completeTask(taskID);
			});
		}else{
			conn.complete(tl, t, function(newTask){
				if(settings.get('storeAsEstimate') && timerTask.seconds>0){
					conn.setEstimate(tl, newTask, estString);
				}
				var d = new Date();
				if(settings.get('storeAsNote') && timerTask.seconds>0){
					conn.addNote(tl, newTask, d.format(dateFormat+'/y '+timeFormat), 'Task completed in '+estString);
				}
				reloadList();
				timer.completeTask(taskID);
			});
		}
	});
}

var showDialog = function(config){
	openNewWindow({
		id: config.id? config.id: 'dialog',
		width: 500,
		height: config.height? config.height: 115,
		stateful: true,
		src: 'dialog.html',
		afterOpen: function(win, created){
			if(created)
				win.window.init(config);
		}
	});
}

var doSetName = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter new task name',
			value: t.name
		},
		handler: function(data){
			conn.createTimeline(function(tl){
				conn.setName(tl, t, data, reloadList);
			});
			return true;
		}
	})
};

var doSetList = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	var list = '';
	for(var i = 0; i<conn.lists.length; i++){
		if(conn.lists[i].id==t.list_id)
			list = conn.lists[i].name;
	}
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter new list',
			value: list
		},
		handler: function(data){
			for(var i = 0; i<conn.lists.length; i++){
				if(conn.lists[i].name.toLowerCase().indexOf(data.toLowerCase())==0){
					conn.createTimeline(function(tl){
						conn.setList(tl, t, conn.lists[i].id, reloadList);
					});
					return true;
				}
			}
			showError('Can\'t find list '+data);
			return false;
		}
	})
};

var doSetLocation = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	var location = '';
	for(var i = 0; i<conn.locations.length; i++){
		if(conn.locations[i].id==t.location_id)
			location = conn.locations[i].name;
	}
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter new location',
			value: location
		},
		handler: function(data){
			if(!data || data.trim()==''){
				conn.createTimeline(function(tl){
					conn.setLocation(tl, t, null, reloadList);
				});
				return true;
			}
			for(var i = 0; i<conn.locations.length; i++){
				if(conn.locations[i].name.toLowerCase().indexOf(data.toLowerCase())==0){
					conn.createTimeline(function(tl){
						conn.setLocation(tl, t, conn.locations[i].id, reloadList);
					});
					return true;
				}
			}
			showError('Can\'t find location '+data);
			return false;
		}
	})
};

var doSetTags = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter comma separated tags',
			value: t.tags.join(', ')
		},
		handler: function(data){
			conn.createTimeline(function(tl){
				conn.setTags(tl, t, data, reloadList);
			});
			return true;
		}
	})
};
var doSetDue = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter due date',
			value: t.due_text
		},
		handler: function(data){
			conn.createTimeline(function(tl){
				conn.setDueDate(tl, t, data, reloadList);
			});
			return true;
		}
	})
};

var doSetRepeat = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter recurrence',
			value: ''
		},
		handler: function(data){
			conn.createTimeline(function(tl){
				conn.setRecurrence(tl, t, data, reloadList);
			});
			return true;
		}
	})
};

var doSetEstimate = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	showDialog({
		field:{
			xtype: 'textfield',
			fieldLabel: 'Enter time estimated',
			value: t.estimate
		},
		handler: function(data){
			conn.createTimeline(function(tl){
				conn.setEstimate(tl, t, data, reloadList);
			});
			return true;
		}
	})
};

var doSetTopPriority = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	conn.createTimeline(function(tl){
		conn.setPriority(tl, t, 1, reloadList);
	});
};

var doSetMiddlePriority = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	conn.createTimeline(function(tl){
		conn.setPriority(tl, t, 2, reloadList);
	});
};

var doSetLowPriority = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	conn.createTimeline(function(tl){
		conn.setPriority(tl, t, 3, reloadList);
	});
};

var doSetNoPriority = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	conn.createTimeline(function(tl){
		conn.setPriority(tl, t, 4, reloadList);
	});
};

var doPostpone = function(){
	if(selectionModel.getCount()<=0)
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	conn.createTimeline(function(tl){
		conn.postpone(tl, t, reloadList);
	});
};

var doDeleteTask = function(){
	if(selectionModel.getCount()<=0)
		return;
	if(!confirm('Delete task "'+selectionModel.getSelected().get('title')+'"?'))
		return;
	var t = conn.getTaskFromList(selectionModel.getSelected().get('id')) || {};
	conn.createTimeline(function(tl){
		conn.deleteTask(tl, t, reloadList);
	});
};
var doCompleteTask = function(){
	if(selectionModel.getCount()>0){
		var id = selectionModel.getSelected().get('id');
		completeTask(id);
	}
};

Ext.onReady(function(){
	Ext.QuickTips.init();
//	log(air.NativeApplication.supportsSystemTrayIcon);
	var mainWin = new Ext.air.NativeWindow({
		id: 'mainWindow',
		instance: window.nativeWindow,
		minimizeToTray: air.NativeApplication.supportsSystemTrayIcon,
		trayIcon: air.NativeApplication.supportsSystemTrayIcon? '../res/app/tl16.png': null,
		trayTip: 'YaR Desktop',
		width: settings.get('mainWidth') || defaultState.mainWidth,
		height: settings.get('mainHeight') || defaultState.mainHeight
	});
	sql.init();
	conn.authToken = settings.get('authToken') || '';
	log('Token from settings: '+conn.authToken);

	addField = new Ext.form.TextField({
		width: '100%',
		emptyText: 'Enter task and hit Enter',
		enableKeyEvents: true
	});
	addField.on('keydown', function(item, event){
		if(event.getKey()==27){//ESCAPE
			if(item.getValue())
				item.setValue('');
			else{
				grid.focus(false, 10);
			}
		}
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
		tooltip: 'Complete',
		iconCls: 'icn-complete',
		handler: doCompleteTask,
		enabled: false
	});
	var editBtn = new Ext.Button({
		tooltip: 'Edit',
		iconCls: 'icn-edit2',
		menu: [
			{
				text: 'Name',
				iconCls: 'icn-edit',
				handler: doSetName
			},{
				text: 'List',
				iconCls: 'icn-lists',
				handler: doSetList
			},{
				text: 'Location',
				iconCls: 'icn-location',
				handler: doSetLocation
			},{
				text: 'Tags',
				iconCls: 'icn-tags',
				handler: doSetTags
			},{
				text: 'Due date',
				iconCls: 'icn-due',
				handler: doSetDue
			},{
				text: 'Recurrence',
				iconCls: 'icn-repeat',
				handler: doSetRepeat
			},{
				text: 'Estimate',
				iconCls: 'icn-clock',
				handler: doSetEstimate
			},{
				text: 'Priority',
				iconCls: 'icn-priority',
				menu: [
					{
						text: 'Top',
						iconCls: 'icn-priority-top',
						handler: doSetTopPriority
					},{
						text: 'Middle',
						iconCls: 'icn-priority-middle',
						handler: doSetMiddlePriority
					},{
						text: 'Low',
						iconCls: 'icn-priority-low',
						handler: doSetLowPriority
					},'-',{
						text: 'None',
						handler: doSetNoPriority
					}
				]
			},'-', {
				text: 'Postpone',
				iconCls: 'icn-postpone',
				handler: doPostpone
			},{
				text: 'Delete',
				iconCls: 'icn-delete',
				handler: doDeleteTask
			}
		]
	});

	listButton = new Ext.Button({
		tooltip: 'Select list to display',
		iconCls: 'icn-list',
		menu: []
	});
	currentList = settings.get('showList') || 0;
	conn.listsUpdated = function(lists){
		listButton.menu.removeAll();
		for(var i=0; i<lists.length; i++){
			var mi = listButton.menu.addMenuItem({
				text: lists[i].name,
				checked: lists[i].id==currentList,
				group: 'lists',
				handler: function(item){
					currentList = item.listID;
					reloadList();
//					log('show id', item.listID);
				}
			});
			mi.listID = lists[i].id;
		}
	};

	toolbar = new Ext.Toolbar({
		region: 'north',
		items: [
			{
				tooltip: 'Reload',
				iconCls: 'icn-reload',
				handler: function(){
					reloadList();
				}
			}, completeBtn, editBtn, {
				iconCls: 'icn-undo',
				tooltip: 'Undo last operation',
				handler: function(){
					conn.rollback(reloadList);
				}
			}, listButton, '->', {
				tooltip: 'Settings',
				iconCls: 'icn-settings',
				handler: function(){
					showSettingsWin();
				}
			},{
				tooltip: 'Search',
				enableToggle: true,
				iconCls: 'icn-search',
				handler: function(){
					searchPanel.toggleCollapse(false);
					viewport.syncSize();
					viewport.doLayout();
					if(searchPanel.collapsed){
						if(searchString){
							searchString = null;
							reloadList();
						}
					}else{
						searchString = settings.get('lastQuery');
						searchField.setValue(searchString);
						searchField.focus(true, 10);
					}
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

	searchField.on('keydown', function(item, event){
		if(event.getKey()==27){//ESCAPE
			item.setValue('');
		}
		if(event.getKey()==Ext.EventObject.ENTER && item.getValue()){
			searchString = item.getValue();
			settings.set('lastQuery', searchString);
			reloadList();
		}
	});
	saveSearch = new Ext.Button({
		text: 'Save',
		region: 'east',
		anchor: 'right',
		handler: function(){
			if(!searchString)
				return;
			showDialog({
				field:{
					xtype: 'textfield',
					fieldLabel: 'Enter new smart list name',
					value: ''
				},
				handler: function(data){
					if(data && data!=''){
						conn.createTimeline(function(tl){
							conn.addSmartList(tl, data, searchString, function(){
								conn.getLists();
							});
						});
						return true;
					}else{
						showError('Invalid list name');
						return false;
					}
				}
			});
		},
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
		overCls: 'pointer',
		tooltip: 'Double click to take a rest immediately'
	});

	trackPanel = new Ext.Panel({
		region: 'south',
		autoHeight: true,
		border: false,
		layout: 'fit',
		items: [trackProgress]
	});
	gridStore = new Ext.data.ArrayStore({
		fields: ['id', 'series_id', 'title', 'tags', 'due', 'due_text', 'repeated', 'estimate', 'priority', 'exec_time', 'exec_time_text', 'overdue', 'timer', 'timer_odd', 'completed'],
		sortInfo: {
			field: 'due',
			direction: 'DESC'
		},
		idIndex: 0 // id for each record will be the first element
	});

	selectionModel = new Ext.grid.RowSelectionModel({singleSelect:true});
	selectionModel.on('selectionchange', function(){
//		log('Selected rows: ',selectionModel.getCount());
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
		keys: [
			{
				key: 't',
				fn: function(){
					addField.focus(true, 10);
				}
			},{
				key: 'c',
				fn: doCompleteTask
			},{
				key: 'p',
				fn: doPostpone
			},{
				key: 'd',
				fn: doSetDue
			},{
				key: 'f',
				fn: doSetRepeat
			},{
				key: 'g',
				fn: doSetEstimate
			},{
				key: 's',
				fn: doSetTags
			},{
				key: 'l',
				fn: doSetLocation
			},{
				key: 'r',
				fn: doSetName
			},{
				key: 'z',
				fn: function(){
					conn.rollback(reloadList);
				}
			},{
				key: '1',
				fn: doSetTopPriority
			},{
				key: '2',
				fn: doSetMiddlePriority
			},{
				key: '3',
				fn: doSetLowPriority
			},{
				key: '4',
				fn: doSetNoPriority
			},{
				key: Ext.EventObject.DELETE,
				fn: doDeleteTask
			}
		],
		columns: [
			{id: 'title', header: 'Task', tpl: gridTpl, xtype: 'templatecolumn', dataIndex: 'id'}
		],
		autoExpandColumn: 'title',
		enableHdMenu: false,
		sm: selectionModel
	});
	grid.on('rowdblclick', function(){
		if(selectionModel.getCount()>0){
			showFloatWin(selectionModel.getSelected());
		}
	});
	mainWin.on('move', function(event){
//		log('x: '+event.afterBounds.x+', '+event.afterBounds.y);
		settings.set('mainLeft', event.afterBounds.x);
		settings.set('mainTop', event.afterBounds.y);
	});
	mainWin.on('resize', function(event){
//		log('width: '+event.afterBounds.width+', '+event.afterBounds.height);
		settings.set('mainWidth', event.afterBounds.width);
		settings.set('mainHeight', event.afterBounds.height);
		setTimeout(function(){
//				log('update layout');
				viewport.syncSize();
				viewport.doLayout();
			}, 100);
	});
	mainWin.on('closing', function(event){
		settings.saveState();
		//Save all timers
		timer.saveAllTimes();
		air.NativeApplication.nativeApplication.exit(0);
	});
	mainWin.moveTo(settings.get('mainLeft') || defaultState.mainLeft, settings.get('mainTop') || defaultState.mainTop);
	mainWin.show();
	checkWindowVisible(mainWin);
	mainWin.instance.activate();
	timer.init();

	air.NativeApplication.nativeApplication.addEventListener(air.InvokeEvent.INVOKE, function(event){
		var getParam = function(param){
			for(var i = 0; i<event.arguments.length; i++){
				if(event.arguments[i]==param && i<event.arguments.length-1)
					return event.arguments[i+1];
			}
			return null;
		}
		var hasParam = function(param){
			for(var i = 0; i<event.arguments.length; i++){
				if(event.arguments[i]==param)
					return true;
			}
			return false;
		}
		if(hasParam('--new-task')){
//			mainWin.instance.orderToFront();
			if(mainWin.instance.displayState==air.NativeWindowDisplayState.MINIMIZED)
				mainWin.instance.restore();
			air.NativeApplication.nativeApplication.activate(mainWin.instance);
			mainWin.instance.activate();
			var text = getParam('--new-task');
			if(text){
				addField.setValue(text);
			}
			addField.focus(false, 10);
		}
	});
	air.NativeApplication.nativeApplication.addEventListener(air.Event.USER_IDLE, timer.userIdle);
	air.NativeApplication.nativeApplication.addEventListener(air.Event.USER_PRESENT, timer.userActive);
	Ext.TaskMgr.start({
		run: timer.oneSecond,
		interval: 1000
	});
	updateTask = {
		run: reloadByTimer,
		interval: (settings.get('updateMinutes') || 15)*60*1000
	};
	Ext.TaskMgr.start(updateTask);
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
		if(message){
			log('We got an error!', code, message);
			statusbar.setStatus({
				text: message,
				iconCls: 'icn-error',
				clear: {
					wait: 5000,
					anim: false
				}
			});
		}else{
			statusbar.clearStatus({
				useDefaults: true
			});
		}
		toolbar.setDisabled(false);
		grid.setDisabled(false);
		topPanel.setDisabled(false);
	}

	conn.checkToken(function(xml){
		conn.getSettings(function(s){
			dateFormat = s.dateformat;
			timeFormat = s.timeformat;
		});
		conn.getLists(function(){
			reloadList();
		});
		conn.getLocations();
	}, function(code, message){
		showSettingsWin();
//		log('Check failed, '+code+':'+message);
	});
	trackProgress.el.on('dblclick', function(){
		timer.barDblClick();
		return false;
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
timer.runningTasks = {};
timer.displayTask = 0;
timer.saveSeconds = 0;

timer.startTask = function(taskID, force){
	var row = findInGrid(taskID);
	var task = timer.runningTasks[taskID] || {
		seconds: sql.getSeconds(taskID),
		background: row? sql.isBackground(row.get('series_id')): false,
		paused: settings.get('openPaused') || false
	};
	task.paused = force? false: task.paused;
	timer.runningTasks[taskID] = task;
	return task;
};

timer.getTask = function(taskID){
	var row = findInGrid(taskID);
	return timer.runningTasks[taskID] || {
		seconds: sql.getSeconds(taskID),
		background: row? sql.isBackground(row.get('series_id')): false,
		paused: settings.get('openPaused') || false
	};
};

timer.pauseTask = function(taskID, force){
	var task = timer.runningTasks[taskID];
	if(task){
		if(task.background && !force)
			return;
		sql.saveSeconds(taskID, task.seconds);
		task.paused = true;
	}
	var row = findInGrid(taskID);
	if(row){
		row.set('timer', null);
	}
}

timer.completeTask = function(taskID){
	var task = timer.runningTasks[taskID];
	if(task){
		timer.pauseTask(taskID, true);
		timer.runningTasks[taskID] = null;
		sql.deleteSeconds(taskID);
	}
}

timer.setBackgroundTask = function(taskID, background){
	var row = findInGrid(taskID);
	var task = timer.runningTasks[taskID];
	if(row)
		sql.setBackground(row.get('series_id'), background);
	if(task){
		task.background = background;
	}
}

timer.secondsToString = function(seconds){
	var hours = Math.floor(seconds/3600);
	var mins = Math.floor((seconds-hours*3600)/60);
	var secs = seconds-mins*60-hours*3600;
	return (hours>0? hours+':': '')+(hours>0 && mins<10? '0': '')+mins+':'+(secs<10?'0':'')+secs;
}

timer.updateProgress = function(value, seconds, text, green){
	var floatWin = getChildWindow('float');
	if(green){
		trackProgress.el.child('.x-progress-bar').addClass('x-progress-bar-g');
		trackProgress.el.child('.x-progress-text-back').addClass('x-progress-text-back-g');
		if(floatWin){
			floatWin.window.trackProgress.el.child('.x-progress-bar').addClass('x-progress-bar-g');
			floatWin.window.trackProgress.el.child('.x-progress-text-back').addClass('x-progress-text-back-g');
		}
	}else{
		trackProgress.el.child('.x-progress-bar').removeClass('x-progress-bar-g');
		trackProgress.el.child('.x-progress-text-back').removeClass('x-progress-text-back-g');
		if(floatWin){
			floatWin.window.trackProgress.el.child('.x-progress-bar').removeClass('x-progress-bar-g');
			floatWin.window.trackProgress.el.child('.x-progress-text-back').removeClass('x-progress-text-back-g');
		}
	}
	trackProgress.updateProgress(value, text+timer.secondsToString(seconds));
	if(floatWin)
		floatWin.window.trackProgress.updateProgress(value, text+timer.secondsToString(seconds));
//	log('update', value, text+mins+':'+(secs<10?'0':'')+secs);
}

timer.saveAllTimes = function(){
	for(var taskID in timer.runningTasks){
		if(!timer.runningTasks[taskID])
			continue;
		var seconds = timer.runningTasks[taskID].seconds;
		sql.saveSeconds(taskID, seconds);
	}
}

timer.barDblClick = function(){
	if(!timer.trackWorkTime)
		return;
	if(timer.action==timer.TYPE_USER_ACTIVE || timer.action==timer.TYPE_USER_OVERWORK){
		//Take a rest immediately
		timer.isUserActive = false;
		timer.idleSeconds = 0;
		timer.action = timer.TYPE_USER_BREAK_OVERWORK;
		timer.showProgress();
	}else{
		if(timer.action == timer.TYPE_USER_BREAK_OVERWORK){
			//Start work immediately
			timer.isUserActive = true;
			timer.action = timer.TYPE_USER_ACTIVE;
			timer.workSeconds = 0;
			timer.showProgress();
		}
	}
}

timer.oneSecond = function(){
	//Add seconds to all running tasks
	timer.odd = !timer.odd;
	timer.saveSeconds++;
	var saveTime = false;
	if(timer.saveSeconds>=30){
		saveTime = true;
		timer.saveSeconds = 0;
	}
	var floatWin = getChildWindow('float');
	for(var taskID in timer.runningTasks){
		if(!timer.runningTasks[taskID])
			continue;
		if(!timer.isUserActive && !timer.runningTasks[taskID].background)
			continue;
		if(timer.runningTasks[taskID].paused)
			continue;
		var seconds = timer.runningTasks[taskID].seconds+1;
		timer.runningTasks[taskID].seconds = seconds;
		if(saveTime)
			sql.saveSeconds(taskID, seconds);
		//Find task in grid
		var row = findInGrid(taskID);
		if(row){
			row.set('timer', '['+timer.secondsToString(seconds)+']');
			row.set('timer_odd', timer.odd? 0: 1);
		}
		if(timer.displayTask==taskID && floatWin && floatWin.window.timerDiv){
			floatWin.window.timerDiv.dom.innerHTML = timer.secondsToString(seconds);
		}
	}
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
	if(!timer.trackWorkTime)
		return;
	switch(timer.action){
		case timer.TYPE_USER_ACTIVE:
			timer.updateProgress(timer.workSeconds/timer.workTimePeriod, timer.workSeconds, 'Work time: ');
			break;
		case timer.TYPE_USER_OVERWORK:
			timer.updateProgress(timer.odd? 0: 1, timer.workSeconds-timer.workTimePeriod, 'Overwork time: -');
			break;
		case timer.TYPE_USER_BREAK_OVERWORK:
		case timer.TYPE_USER_BREAK_YEARLY:
			timer.updateProgress(timer.idleSeconds/timer.restPeriod, timer.idleSeconds, 'Rest time: ', true);
			break;
		case timer.TYPE_USER_BREAK_WAIT_WORK:
			timer.updateProgress(timer.odd? 0: 1, timer.idleSeconds, 'Rest time: ', true);
			break;
	}
}

timer.init = function(){
	var prevTrack = this.trackWorkTime || false;
	this.trackWorkTime = settings.get('trackWorkTime') || false;
	this.workTimePeriod = (settings.get('workTimePeriod') || 50)*60;
	this.restPeriod = (settings.get('restPeriod') || 10)*60;
	air.NativeApplication.nativeApplication.idleThreshold = settings.get('inactivityDelay') || 30;
	var floatWin = getChildWindow('float');
	if(!this.trackWorkTime){
		trackProgress.updateProgress(0, 'Disabled');
		if(floatWin){
			floatWin.window.trackProgress.updateProgress(0, 'Disabled');
			floatWin.window.trackProgress.setDisabled(true);
		}
		trackPanel.setDisabled(true);
	}else{
		if(!prevTrack){
			this.action = this.TYPE_USER_ACTIVE;
			this.workSeconds = 0;
		}
		if(floatWin){
			floatWin.window.trackProgress.setDisabled(false);
		}
		trackPanel.setDisabled(false);
		this.userActive();
	}
};

timer.userActive = function(){
	log('userActive');
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
	log('userIdle');
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
