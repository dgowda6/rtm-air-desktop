Ext.uniqueId = function(){
	var t = String(new Date().getTime()).substr(4);
	var s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	for(var i = 0; i < 4; i++){
		t += s.charAt(Math.floor(Math.random()*26));
	}
	return t;
}

var storeFields = [
    {name: 'name', type:'string'},
    {name: 'value', type:'string'},
    {name: 'int_value', type:'int'},
    {name: 'bool_value', type:'boolean'},
];

var storeRecord = Ext.data.Record.create(storeFields);

var Store = Ext.extend(Ext.data.SimpleStore, {
	constructor: function(){
		Store.superclass.constructor.call(this, {
			fields: storeFields
		});
	},

	file : 'rtm.settings',
	dataArray: [],

	getString: function(name, defaultValue){

	},

	addSession: function(aServer, aLogin, aToken, aNoteID, aLoadAtStart){
		var lID = Ext.uniqueId();
		var lRecord = new sessionRecord({
			session_id: lID,
			server: aServer,
			login: aLogin,
			save_pass: aToken?true:false,
			agenda_id: aNoteID,
			notes_id: aNoteID,
			tasks_id: aNoteID,
			images_id: aNoteID,
			files_id: aNoteID,
			bookmarks_id: aNoteID,
			show_reminder: true,
			show_reminder_before: 15,
			load_at_start: aLoadAtStart,
			update_interval: 30,
			next_days: 2,
			token: aToken?aToken:''
		});
		this.add(lRecord);
		this.save();
		return lID;
	},

	load : function(){
		var storeFile = air.File.applicationStorageDirectory.resolvePath(this.file);
		if(!storeFile.exists){
			this.dataArray = this.defaultData || [];
		}else{
			var stream = new air.FileStream();
			stream.open(storeFile, air.FileMode.READ);

			var storeData = stream.readObject();
			stream.close();

			this.dataArray = storeData || this.defaultData || [];
		}
		this.removeAll();
		for(var i = 0; i<this.dataArray.length; i++){
			this.add(new Ext.data.Record(this.dataArray[i]));
		}
	},

	save : function(){
		var lData = this.dataArray = [];

		this.each(function(record){
			var lDataItem = {};
			for(var i = 0; i<storeFields.length; i++){
				var lField = storeFields[i];
				lDataItem[lField.name] = record.get(lField.name);
			}
			lData[lData.length] = lDataItem;
		});

        var storeFile = air.File.applicationStorageDirectory.resolvePath(this.file);
		var stream = new air.FileStream();
		stream.open(storeFile, air.FileMode.WRITE);
		stream.writeObject(lData);
		stream.close();
	}

});

var store = new Store({});

sessions.load();
