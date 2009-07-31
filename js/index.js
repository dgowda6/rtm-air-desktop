var viewport = null;
var toolbar = null;
var grid = null;
var gridStore = null;
var topPanel = null;
var searchField = null;
var searchPanel = null;
var addField = null;
var statusbar = null;
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
	toolbar = new Ext.Toolbar({
		region: 'north',
		items: [
			{
				text: 'Reload',
				handler: function(){
					reloadList();
				}
			}, '->',{
				text: 'Settings',
				handler: function(){
					openNewWindow({
						id: 'settingsWin',
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
		items: [searchField, saveSearch]
	});

	topPanel = new Ext.Panel({
		tbar: toolbar,
		border: false,
		region: 'north',
		autoHeight: true,
		items: [addField, searchPanel]
	});

	gridStore = new Ext.data.ArrayStore({
		fields: ['id', 'title', 'tags', 'due', 'due_text', 'repeated', 'estimate', 'priority', 'exec_time', 'exec_time_text', 'overdue'],
		sortInfo: {
			field: 'due',
			direction: 'DESC'
		},
		idIndex: 0 // id for each record will be the first element
	});

	grid = new Ext.grid.GridPanel({
		store: gridStore,
//		tbar: searchToolbar,
		bbar: statusbar,
		region: 'center',
		columns: [
			{id: 'title', header: 'Task', tpl: gridTpl, xtype: 'templatecolumn', dataIndex: 'id'}
		],
		autoExpandColumn: 'title',
		enableHdMenu: false,
		sm: new Ext.grid.RowSelectionModel({singleSelect:true})
	});

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
	viewport = new Ext.Viewport({
		layout: 'border',
		items: [grid, topPanel]
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
