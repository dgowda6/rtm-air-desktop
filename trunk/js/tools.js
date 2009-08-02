var openNewWindow = function(config){
	var win = Ext.air.NativeWindowManager.get(config.id);
	if(win) {
		win.instance.orderToFront();
		win.instance.activate();
		return false;
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
		if(config.stateful){
			win.on('move', function(event){
				settings.set(config.id+'Left', event.afterBounds.x);
				settings.set(config.id+'Top', event.afterBounds.y);
			});
			win.on('resize', function(event){
				settings.set(config.id+'Width', event.afterBounds.width);
				settings.set(config.id+'Height', event.afterBounds.height);
			});
			win.moveTo(settings.get(config.id+'Left') || config.left || 10,
				settings.get(config.id+'Top') || config.top || 10);
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

Date.precompileFormats("Y-m-d\\TH:i:s\\Z|Z|n/j|g:i a|l|Y|Y-m-d|z");

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
