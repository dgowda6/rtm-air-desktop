var openNewWindow = function(config){
	var win = Ext.air.NativeWindowManager.get(config.id);
	if(win) {
		win.instance.orderToFront();
		win.instance.activate();
		return false;
	} else {
		win = new Ext.air.NativeWindow({
			id: config.id,
			file: config.src,
			chrome: config.chrome?aChrome:'standard',
			type: config.type?aWinType: 'normal',
			transparent: config.transparent
		});
	}
	return true;
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
