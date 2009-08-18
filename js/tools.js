var windows = {};
var childWindowOpened = function(aAirWin, aWindow){
	for(var id in windows){
		if(windows[id].nativeWindow==aAirWin){
			windows[id].window = aWindow;
			if(windows[id].afterOpen)
				windows[id].afterOpen(windows[id], true);
			return;
		}
	};
}

var getChildWindow = function(winID){
	var win = Ext.air.NativeWindowManager.get(winID);
	if(windows[winID] && windows[winID].window && win){
		return windows[winID];
	}
	return null;
}

var escapeHTML = function(s){
	if(!s)
		return '';
	var res = s.replace(/</g, '&lt;');
	res = res.replace(/>/g, '&gt;');
	res = res.replace(/\n/g, '<br/>');
	return res;
};

var checkWindowVisible = function(win){
	air.trace('checkWindowVisible', win.instance.x, win.instance.y, win.instance.width, win.instance.height);
	var ok = false;
	for(var i = 0; i<air.Screen.screens.length; i++){
		var sc = air.Screen.screens[i];
		air.trace('Screen', i, sc.visibleBounds.x, sc.visibleBounds.y, sc.visibleBounds.width, sc.visibleBounds.height);
		if(win.instance.x>=sc.visibleBounds.x && win.instance.y>=sc.visibleBounds.y &&
		   win.instance.x+win.instance.width<=sc.visibleBounds.x+sc.visibleBounds.width &&
		   win.instance.y+win.instance.height<=sc.visibleBounds.y+sc.visibleBounds.height){
			ok = true;
		}
	}
	if(!ok){
		win.moveTo(air.Screen.mainScreen.visibleBounds.x+(air.Screen.mainScreen.visibleBounds.width-win.instance.width)/2,
				   air.Screen.mainScreen.visibleBounds.y+(air.Screen.mainScreen.visibleBounds.height-win.instance.height)/2);
	}
}
var openNewWindow = function(config){
	var win = Ext.air.NativeWindowManager.get(config.id);
	if(win) {
		win.instance.orderToFront();
		win.instance.activate();
		checkWindowVisible(win);
		if(windows[config.id] && config.afterOpen){
			config.afterOpen(windows[config.id], false);
		}
	} else {
		var conf = {
			id: config.id,
			file: config.src,
			chrome: config.chrome?config.chrome:'standard',
			resizeable: true,
			type: config.type || 'normal',
			transparent: config.transparent
		};
		if(config.stateful){
			conf.width = settings.get(config.id+'Width') || config.width || 500;
			conf.height = settings.get(config.id+'Height') || config.height || 500;
		}
		win = new Ext.air.NativeWindow(conf);
		windows[config.id] = {
			nativeWindow: win.instance,
			afterOpen: config.afterOpen
		};
		if(config.stateful){
			win.on('move', function(event){
				settings.set(config.id+'Left', event.afterBounds.x);
				settings.set(config.id+'Top', event.afterBounds.y);
			});
			win.on('resize', function(event){
				air.trace(event.afterBounds.width, event.afterBounds.height);
				settings.set(config.id+'Width', event.afterBounds.width);
				settings.set(config.id+'Height', event.afterBounds.height);
			});
			var left = settings.get(config.id+'Left') || config.left || -1;
			var top = settings.get(config.id+'Top') || config.top || -1;
			if(left!=-1 && top!=-1)
				win.moveTo(left, top);
			checkWindowVisible(win);
		}
	}
	win.instance.alwaysInFront = config.onTop || false;
	return win;
}

var showError = function(aMessage){
	alert(aMessage);
}

Date.precompileFormats = function(s){
    var formats = s.split('|');
    for (var i = 0, len = formats.length; i < len; i++) {
	Date.createFormat(formats[i]);
        Date.createParser(formats[i]);
    }
}

Date.precompileFormats("Y-m-d\\TH:i:s\\Z|Z|n/j|g:i a|l|Y|Y-m-d|z|n/j/y g:i a");

Ext.menu.Item.prototype.itemTpl=new Ext.XTemplate(
    '<a id="{id}" class="{cls}" hidefocus="true" unselectable="on" href="{href}"',
        '<tpl if="hrefTarget">',
            ' target="{hrefTarget}"',
        '</tpl>',
     '>',
         '<img src="{icon}" class="x-menu-item-icon {iconCls}">',
         '<span class="x-menu-item-text">{text}</span>',
     '</a>'
 );

Ext.form.ComboBox.prototype.tpl = new Ext.XTemplate('<tpl for="."><div class="x-combo-list-item">{text}</div></tpl>');

Ext.layout.MenuLayout.itemTpl=Ext.layout.MenuLayout.prototype.itemTpl=new Ext.XTemplate(
    '<li id="{itemId}" class="{itemCls}">',
        '<tpl if="needsIcon">',
            '<img src="{icon}" class="{iconCls}">',
        '</tpl>',
    '</li>'
);

var daysBetween = function(d1, d2){
	var y1 = parseInt(d1.format('Y'));
	var y2 = parseInt(d2.format('Y'));
	var dy1 = parseInt(d1.format('z'));
	var dy2 = parseInt(d2.format('z'));
	if(y1==y2){
		return dy1-dy2;
	}
	if(y1<y2){
		return -(d1.isLeapYear()? 366: 365)+dy1-dy2;
	}
	return (d2.isLeapYear()? 366: 365)-dy2+dy1;
}
