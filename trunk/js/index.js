var viewport = null;
var toolbar = null;
var grid = null;
var topPanel = null;
var searchField = null;
var addField = null;

Ext.onReady(function(){
	air.trace(air.File.applicationStorageDirectory.nativePath);
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
				text: 'Search'
			},
			{
				text: 'Settings',
				handler: function(){
					air.trace('Show settings dialog');
					openNewWindow({
						id: 'settingsWin',
						src: 'settings.html'
					});
				}
			}
		]
	});

	topPanel = new Ext.Panel({
		tbar: toolbar,
		layout: 'anchor',
		region: 'north',
		height: 100,
		items: [searchField, addField]
	});

	var gridStore = new Ext.data.ArrayStore({
		fields: ['id', 'title'],
		idIndex: 0 // id for each record will be the first element
	});

	grid = new Ext.grid.GridPanel({
		store: gridStore,
		region: 'center',
		columns: [
			{id: 'title', header: 'Task', dataIndex: 'title'}
		],
		autoExpandColumn: 'title',
		enableHdMenu: false,
		sm: new Ext.grid.RowSelectionModel({singleSelect:true})
	});

	mainWin.on('move', function(event){
		air.trace('x: '+event.afterBounds.x+', '+event.afterBounds.y);
		settings.set('mainLeft', event.afterBounds.x);
		settings.set('mainTop', event.afterBounds.y);
	});
	mainWin.on('resize', function(event){
		air.trace('width: '+event.afterBounds.width+', '+event.afterBounds.height);
		settings.set('mainWidth', event.afterBounds.width);
		settings.set('mainHeight', event.afterBounds.height);
	});
	mainWin.on('close', function(event){
		air.NativeApplication.nativeApplication.exit(0);
	});
	mainWin.moveTo(settings.get('mainLeft') || defaultState.mainLeft, settings.get('mainTop') || defaultState.mainTop);
	mainWin.show();
	mainWin.instance.activate();
	viewport = new Ext.Viewport({
		layout: 'border',
		items: [grid, topPanel]
	});
	conn.checkToken(function(xml){
		air.trace('Check was OK');
	}, function(code, message){
		air.trace('Check failed, '+code+':'+message);
	});
});
