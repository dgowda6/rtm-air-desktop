var opener = Ext.air.NativeWindow.getRootHtmlWindow();
Ext.onReady(function(){
	window.nativeWindow.activate();
	opener.childWindowOpened(window.nativeWindow, window);
});

var init = function(config){
	window.nativeWindow.title = config.title || (config.field.fieldLabel+':');
	config.field.name = 'field';
	var form = new Ext.form.FormPanel({
		frame: 'true',
		labelWidth: 200,
		defaults:{
		anchor: '100%'
		},
		items: config.field,
		buttons:[
			{
				text: 'Ok',
				handler: function(){
					if(config.handler(form.getForm().getValues().field))
						window.nativeWindow.close();
				}
			},{
				text: 'Cancel',
				handler: function(){
					window.nativeWindow.close();
				}
			}
		]
	});
	new Ext.Viewport({
		layout: 'fit',
		items: form
	});
}
