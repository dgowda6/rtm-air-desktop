var opener = Ext.air.NativeWindow.getRootHtmlWindow();

var userButton = null;

Ext.onReady(function(){

	var buttonStatus = -1;
	userButton = new Ext.Button({
		text: 'Checking...',
		width: 200,
		fieldLabel: 'User permission status',
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
						mask.hide();
						userButton.setText(user.username+': remove permission');
						air.trace('Saving token '+opener.conn.authToken);
						opener.settings.set('authToken', opener.conn.authToken);
						buttonStatus = 2;
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
	var form = new Ext.form.FormPanel({
		frame: 'true',
		items:[
			userButton
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
		userButton.setText(user.username+': remove permission');
		buttonStatus = 2;
		mask.hide();
	}, function(){
		buttonStatus = 0;
		userButton.setText('Grant permission');
		mask.hide();
	});
});
