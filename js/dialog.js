var opener = Ext.air.NativeWindow.getRootHtmlWindow();
Ext.onReady(function(){
	window.nativeWindow.activate();
	opener.childWindowOpened(window.nativeWindow, window);
});

var init = function(config){
	window.nativeWindow.title = config.title || (config.field.fieldLabel+':');
	config.field.name = 'field';
	config.field.enableKeyEvents = true;
	var form = new Ext.form.FormPanel({
		frame: 'true',
		labelWidth: config.labelWidth || 200,
		defaults:{
		anchor: '100%'
		},
		items: config.field,
		buttons:[
			{
				text: 'Ok',
				handler: function(){
					var data = form.getForm().getValues().field;
					form.setDisabled(true);
					if(config.handler(data))
						window.nativeWindow.close();
					else{
						form.setDisabled(false);
						window.nativeWindow.activate();
						form.items.itemAt(0).focus(config.field.xtype=='textfield', 10);
					}
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
	form.items.itemAt(0).on('keydown', function(item, event){
		if(event.getKey()==27){
			window.nativeWindow.close();
		}
		if(event.getKey()==Ext.EventObject.ENTER && config.field.xtype=='textfield'){
			var data = form.getForm().getValues().field;
			form.setDisabled(true);
			if(config.handler(data))
				window.nativeWindow.close();
			else{
				form.setDisabled(false);
				window.nativeWindow.activate();
				form.items.itemAt(0).focus(true, 10);
			}
		}
	});
	form.items.itemAt(0).focus(config.field.xtype=='textfield', 10);
}
