Ext.onReady(function(){
	var mainWin = new Ext.air.NativeWindow({
		id: 'mainWindow',
		instance: window.nativeWindow,
		minimizeToTray: true,
		trayTip: 'RTM Desktop',
		width: 200,
		height: 600
	});
	mainWin.show();
	mainWin.instance.activate();
	air.trace('Window activated');
});
