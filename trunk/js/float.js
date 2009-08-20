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
var repeatDiv = null;
var notesDiv = null;
var locationDiv = null;
var locationLink = null;
var locationURL = null;
var pauseBtn = null;
var noPauseBtn = null;
var paused = false;
var notesPanel = null;

var addEditNote = function(panel, opener){
	var text = '';
	var newNote = true;
	var task = opener.conn.getTaskFromList(opener.timer.displayTask);
	var note = null;
	if(panel.noteID){
		air.trace('we have noteID', panel.noteID);
		if(task){
			for(var i = 0; i<task.notes.length; i++){
				if(task.notes[i].id==panel.noteID){
					newNote = false;
					note = task.notes[i];
					text = (task.notes[i].title?(task.notes[i].title+'\n\n'): '')+task.notes[i].body;
				}
			}
		}
	}
	opener.showDialog({
		id: 'noteEdit',
		title: newNote? 'New note:': 'Edit note:',
		height: 300,
		labelWidth: 70,
		field:{
			xtype: 'textarea',
			fieldLabel: 'Note text',
			value: text,
			height: 200
		},
		handler: function(data){
			var firstEnter = data.indexOf('\n');
			var title = firstEnter!=-1? data.substr(0, firstEnter).trim(): '';
			var body = firstEnter!=-1? data.substr(firstEnter).trim(): data.trim();
			if(!body){
				opener.showError('Note is empty');
				return false;
			}
			air.trace('Ready to save task title', title, 'body', body);
			opener.conn.createTimeline(function(tl){
				if(newNote){
					opener.conn.addNote(tl, task, title, body, function(n){
						air.trace('after add title', n.title, 'body', n.body);
						opener.addNote(n, window);
					});
				}else{
					note.title = title;
					note.body = body;
					opener.conn.editNote(tl, task, note, function(n){
						air.trace('after edit title', n.title, 'body', n.body);
						panel.setTitle(opener.escapeHTML(n.title) || 'Untitled');
						panel.body.dom.innerHTML = opener.escapeHTML(n.body);
						notesPanel.doLayout();
					});
				}
			});
			return true;
		}
	})
}

Ext.onReady(function(){
	Ext.QuickTips.init();
	window.nativeWindow.addEventListener(air.Event.CLOSE, function(){
		opener.timer.pauseTask(opener.timer.displayTask);
	});
	window.nativeWindow.activate();
	trackProgress = new Ext.ProgressBar({
		columnWidth: 1
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
	pauseBtn = new Ext.Button({
		iconCls: 'icn-pause',
		tooltip: 'Pause',
		enableToggle: true,
		toggleHandler: function(button, state){
			if(state){
				opener.timer.pauseTask(opener.timer.displayTask, true);
			}else{
				opener.timer.startTask(opener.timer.displayTask, true);
			}
		}
	});

	noPauseBtn = new Ext.Button({
		iconCls: 'icn-background',
		tooltip: 'Background task',
		enableToggle: true,
		toggleHandler: function(b, state){
			opener.timer.setBackgroundTask(opener.timer.displayTask, state);
		}
	});

	bottomBar = new Ext.Toolbar({
		items:[
			pauseBtn, {
				tooltip: 'Done',
				iconCls: 'icn-complete',
				handler: function(){
					opener.completeTask(opener.timer.displayTask);
					window.nativeWindow.close();
				}
			},{
				tooltip: 'Edit',
				iconCls: 'icn-clock',
				handler: function(){
					opener.showDialog({
						field:{
							xtype: 'textfield',
							fieldLabel: 'Enter new time',
							value: timerDiv.dom.innerHTML
						},
						handler: function(data){
//							air.trace('Validate '+data);
							var arr = data.split(':');
							var secs = 0;

							for(var i = 0; i<arr.length; i++){
								secs = secs*60+parseInt(arr[i]);
							}
							var task = opener.timer.getTask(opener.timer.displayTask);
							if(task){
								task.seconds = secs;
								timerDiv.dom.innerHTML = opener.timer.secondsToString(task.seconds);
							}

							return true;
						}
					})
				}
			}, '->', noPauseBtn
		]
	});
	var htmlPanel = new Ext.Panel({
		tools: [
			{
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
			},{
				id: 'close',
				handler: function(){
					window.nativeWindow.close();
				}
			}
		],
		title: 'Current task',
		region: 'center',
		bbar: bottomBar,
		html: '<div id="float-top"><div id="float-title"></div><div id="float-bottom"><div id="float-row"><div id="float-timer"></div><div id="float-right"><div id="float-tags"></div><div id="float-due"></div><div id="float-notes" ext:qtip="Task has notes">&nbsp;</div><div id="float-repeat" ext:qtip="Task is recurrent">&nbsp;</div><div id="float-location"><a href="#" id="float-location-link"></a></div></div></div></div></div>',
		bodyCssClass: 'resizer-bg',
		listeners: {
			render: function(p) {
				p.getEl().on('mousedown', function(){
					window.nativeWindow.startMove();
					return true;
				});
			},
			single: true  // Remove the listener after first invocation
		}
	});
	window.nativeWindow.alwaysInFront = opener.settings.get('floatOnTop');
	notesPanel = new Ext.Panel({
		region: 'east',
		split: true,
		title: 'Notes',
		layout: 'anchor',
		autoScroll: true,
		forceLayout: true,
		width: opener.settings.get('notesPanelWidth') || 180,
		collapsible: true,
		collapsed: true,
		tools: [
			{
				id:'plus',
				handler: function(){
					addEditNote(notesPanel, opener);
				}
			}
		]
	});
	notesPanel.on('resize', function(){
		air.trace('resize', notesPanel.getWidth());
		opener.settings.set('notesPanelWidth', notesPanel.getWidth());
	});
	mainPanel = new Ext.Panel({
		layout: 'border',
		border: true,
		items: [htmlPanel, bottomPanel, notesPanel]
	});
	new Ext.Viewport({
		layout: 'fit',
		items: mainPanel
	});
	opacity = opener.settings.get('floatOpacity') || 1;
	Ext.get(document.body).setOpacity(opacity);
	Ext.get(htmlPanel.el).on('mousewheel', function(event){
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
	locationDiv = Ext.get('float-location');
	locationLink = Ext.get('float-location-link');
	repeatDiv = Ext.get('float-repeat');
	repeatDiv.setVisibilityMode(Ext.Element.DISPLAY);
	notesDiv = Ext.get('float-notes');
	notesDiv.setVisibilityMode(Ext.Element.DISPLAY);
	locationLink.on('click', function(){
		air.navigateToURL(new air.URLRequest(locationURL));
		return false;
	})
	trackProgress.updateProgress(0, 'Disabled');
	opener.childWindowOpened(window.nativeWindow, window);
});

var loadTaskData = function(record){

}
