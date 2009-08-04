var opener = Ext.air.NativeWindow.getRootHtmlWindow();
var statusbar = null;
var mainPanel = null;
var htmlPanel = null;
var bottomBar = null;
var trackProgress = null;
var opacity = 1;
var titleDiv = null;
var timerDiv = null;
var tagsDiv = null;
var dueDiv = null;

Ext.onReady(function(){
	window.nativeWindow.activate();
	trackProgress = new Ext.ProgressBar({
		columnWidth: 1
//		width: 'auto'
	});
	var resizePanel = new Ext.Panel({
		width: 16,
		height: 20,
		bodyCssClass: 'resizer-bg',
		border: false,
		html: '<div class="resizer">&nbsp;</div>',
		overCls : 'mouse-resize',
		listeners: {
			render: function(p) {
				p.getEl().on('mousedown', function(){
					window.nativeWindow.startResize(air.NativeWindowResize.BOTTOM_RIGHT);
					return false;
				});
			},
			single: true  // Remove the listener after first invocation
		}
	});
	var bottomPanel = new Ext.Panel({
		layout: 'column',
		region: 'south',
		width: '100%',
		border: false,
		autoHeight: true,
		items: [trackProgress, resizePanel]
	});
	bottomBar = new Ext.Toolbar({
		items:[
			{
				text: 'Pause',
				handler: function(){
					air.trace('Pause click');
				}
			},{
				text: 'Done',
				handler: function(){
					air.trace('Done click');
				}
			},{
				text: 'Edit',
				handler: function(){
					air.trace('Edit click');
				}
			}, '->',{
				text: 'No pause',
				toggle: true,
				handler: function(){

				}
			}
		]
	});
	var htmlPanel = new Ext.Panel({
		tools: [
			{
				id: 'minimize',
				handler: function(){
					window.nativeWindow.close();
				}
			},{
				id: 'unpin',
				hidden: !opener.settings.get('floatOnTop'),
				handler: function(e, el, panel){
					panel.getTool('pin').show();
					panel.getTool('unpin').hide();
					window.nativeWindow.alwaysInFront = false;
					opener.settings.set('floatOnTop', false);
				}
			},{
				id:'pin',
				hidden: opener.settings.get('floatOnTop'),
				handler: function(e, el, panel){
					panel.getTool('pin').hide();
					panel.getTool('unpin').show();
					window.nativeWindow.alwaysInFront = true;
					opener.settings.set('floatOnTop', true);
				}
			}
		],
		title: 'Current task',
		region: 'center',
		bbar: bottomBar,
		html: '<div id="float-top"><div id="float-title">Title very very long Title very very long Title very very long </div><div id="float-bottom"><div id="float-row"><div id="float-timer">0:00</div><div id="float-right"><div id="float-tags">tag1, tag2, tag1, tag2, tag1, tag2, </div><div id="float-due">Today</div></div></div></div></div>',
		bodyCssClass: 'resizer-bg',
		border: false,
		listeners: {
			render: function(p) {
				p.getEl().on('mousedown', function(){
					window.nativeWindow.startMove();
					return false;
				});
			},
			single: true  // Remove the listener after first invocation
		}
	});
	window.nativeWindow.alwaysInFront = opener.settings.get('floatOnTop');
	mainPanel = new Ext.Panel({
		layout: 'border',
		border: true,
		items: [htmlPanel, bottomPanel]
	});
	new Ext.Viewport({
		layout: 'fit',
		items: mainPanel
	});
	opacity = opener.settings.get('floatOpacity') || 1;
	Ext.get(document.body).setOpacity(opacity);
	Ext.get(document.body).on('mousewheel', function(event){
		if(event.getWheelDelta()>0){
			if(opacity<1)
				opacity += 0.05;
		}else{
			if(opacity>0.15)
				opacity -= 0.05;
		}
		Ext.get(document.body).setOpacity(opacity);
		opener.settings.set('floatOpacity', opacity);
	});
	titleDiv = Ext.get('float-title');
	timerDiv = Ext.get('float-timer');
	tagsDiv = Ext.get('float-tags');
	dueDiv = Ext.get('float-due');
	trackProgress.updateProgress(0, 'Disabled');
	opener.childWindowOpened(window.nativeWindow, window);
});

var loadTaskData = function(record){

}
