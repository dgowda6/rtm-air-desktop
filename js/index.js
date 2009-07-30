var viewport = null;
var toolbar = null;
var grid = null;
var gridStore = null;
var topPanel = null;
var searchField = null;
var addField = null;
var statusbar = null;
var gridTpl = new Ext.XTemplate('<tpl for="."><div class="x-task-item x-task-priority{priority}"><div class="x-task-title">{title}</div><div class="x-task-tags">{tags}</div><div class="x-task-due">{due_text}</div><div style="clear: both;"></div></div></tpl>');


var reloadList = function(){
	gridStore.removeAll();
	conn.getList(settings.get('showList'), function(list){
		for(var i = 0; i<list.length; i++){
			var task = list[i];
			var due = '&nbsp;';
			if(task.due){
				var now = new Date();
				due = task.due.format('n/j');
				if(task.hasTime)
					due += ' '+task.due.format('g:i a');
			}else{

			}
			gridStore.add(new Ext.data.Record({
				id: task.id,
				title: task.name,
				due: task.due? task.due: new Date(),
				due_text: due,
				priority: task.priority,
				tags: task.tags.join(', ')
			}));

			air.trace('Adding', task.name);
		}
		gridStore.sort('due', 'ASC');
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
	searchField = new Ext.form.TextField({
		anchor: '100%'
	});

	addField = new Ext.form.TextField({
		anchor: '100%'
	});

	toolbar = new Ext.Toolbar({
		region: 'north',
		items: [
			{
				text: 'Reload',
				handler: function(){
					reloadList();
				}
			},
			{
				text: 'Settings',
				handler: function(){
					openNewWindow({
						id: 'settingsWin',
						src: 'settings.html'
					});
				}
			}
		]
	});

	statusbar = new Ext.ux.StatusBar({
		defaultText: 'Idle'
	});

	topPanel = new Ext.Panel({
		tbar: toolbar,
		layout: 'anchor',
		region: 'north',
		height: 100,
		items: [searchField, addField]
	});

	gridStore = new Ext.data.ArrayStore({
		fields: ['id', 'title', 'tags', 'due', 'due_text', 'repeated', 'estimate', 'priority', 'exec_time', 'exec_time_text'],
		sortInfo: {
			field: 'due',
			direction: 'DESC'
		},
		idIndex: 0 // id for each record will be the first element
	});

	grid = new Ext.grid.GridPanel({
		store: gridStore,
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

	conn.start = function(){
		statusbar.showBusy('Loading...');
		toolbar.setDisabled(true);
		grid.setDisabled(true);
	}

	conn.end = function(code, message){
		//if(message)
		//	statusbar.clearStatus({
		//		useDe
		//	});
		//else
			statusbar.clearStatus({
				useDefaults: true
			});
		toolbar.setDisabled(false);
		grid.setDisabled(false);
	}

	conn.checkToken(function(xml){
		conn.getLists();
		conn.getLocations();
		reloadList();
	}, function(code, message){
		air.trace('Check failed, '+code+':'+message);
	});
});
