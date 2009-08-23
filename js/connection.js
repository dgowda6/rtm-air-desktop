var conn = {};
conn.apiKey = '6a0f2df056721fb0f6ec9dfd04973053';
conn.secret = '7fafbe6a8c6ff6b7';
conn.start = null;
conn.end = null;
conn.authToken = '';
conn.lists = [];
conn.listsUpdated = null;
conn.locations = [];
conn.timeline = null;
conn.transactions = [];
conn.activeCount = 0;
conn.list = [];
conn.apiURL = 'http://api.rememberthemilk.com/services/rest/';
//conn.apiURL = 'http://localhost:12088/api/';

conn.getTaskFromList = function(id){
	for(var i = 0; i<this.list.length; i++){
		if(this.list[i].id==id)
			return this.list[i];
	}
	return null;
}

conn.active = function(){
	return this.activeCount>0;
}

conn.buildPost = function(data, method){
	var aURL = '';
	var toMD5 = conn.secret;
	var ids = [];
	data.api_key = this.apiKey;
	data.method = method;
	data.auth_token = conn.authToken;
	for(var id in data){
		if(data[id]){
			ids.push(id);
		}
	}
	ids.sort();
	for(var i = 0; i<ids.length; i++){
		var id = ids[i];
		toMD5 += id;
		toMD5 += data[id];
		aURL += (encodeURIComponent(id)+'='+encodeURIComponent(data[id])+'&');
	}
	aURL += 'api_sig='+hex_md5(toMD5);
	return aURL;
}

conn.buildURL = function(data, method, aURL){
	if(!aURL)
		aURL = this.apiURL;
	aURL += '?';
	var toMD5 = conn.secret;
	var ids = [];
	data.api_key = this.apiKey;
	if(method){
		data.method = method;
		data.auth_token = conn.authToken;
	}else{
	}
	for(var id in data){
		if(data[id]){
			ids.push(id);
		}
	}
	ids.sort();
	for(var i = 0; i<ids.length; i++){
		var id = ids[i];
		toMD5 += id;
		toMD5 += data[id];
		aURL += (id+'='+encodeURIComponent(data[id])+'&');
	}
	aURL += 'api_sig='+MD5(toMD5);
	return aURL;
}

conn.makeQuery = function(config){
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
        if (req.readyState == 4) {
			conn.activeCount--;
//			log('response text: ',req.responseText);
            var xml = req.responseXML;
			if(!xml){
				var code = 1;
				var msg = 'Can\'t connect to RTM host';
				if(config.error)
					config.error(code, msg);
				if(conn.end && conn.activeCount==0)
					conn.end(code, msg);
				return;
			}
			if(xml.getElementsByTagName("err").length>0){
				var code = xml.getElementsByTagName("err").item(0).getAttribute('code');
				var msg = xml.getElementsByTagName("err").item(0).getAttribute('msg');
				if(config.error)
					config.error(code, msg);
				if(conn.end && conn.activeCount==0)
					conn.end(code, msg);
			}else{
				if(config.ok)
					config.ok(xml);
				if(conn.end && conn.activeCount==0)
					conn.end();
			}
        }
    };
	if(conn.start && conn.activeCount==0)
		conn.start();
	conn.activeCount++;
	if(!config.url)
		config.url = this.apiURL;
	log('makeQuery to '+config.url+' with '+config.data);
    req.open(config.data? 'POST': 'GET', config.url, config.sync? false: true);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(config.data? config.data: null);
}

conn.setUser = function(xml){
	var user = {};
	user.id = xml.getElementsByTagName('user').item(0).getAttribute('id');
	user.username = xml.getElementsByTagName('user').item(0).getAttribute('username');
	user.fullname = xml.getElementsByTagName('user').item(0).getAttribute('fullname');
	this.user = user;
	return user;
}

conn.checkToken = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.auth.checkToken'),
		ok: function(xml){
			conn.setUser(xml);
			if(ok)
				ok(conn.user);
		},
		error: error
	});
}

conn.getFrob = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.auth.getFrob'),
		ok: function(xml){
			var frob = xml.getElementsByTagName('frob').item(0).childNodes(0).nodeValue;
			conn.frob = frob;
//			log('frob = '+frob);
			if(ok)
				ok(frob);
		},
		error: error
	});
}

conn.getToken = function(ok, error){
	this.makeQuery({
		url: this.buildURL({
			frob: conn.frob
		}, 'rtm.auth.getToken'),
		ok: function(xml){
			var token = xml.getElementsByTagName('token').item(0).firstChild.nodeValue;
//			log('Token: '+token);
			conn.authToken = token;
			conn.setUser(xml);
			if(ok)
				ok(conn.user);
		},
		error: error
	});
}

conn.getLists = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.lists.getList'),
		ok: function(xml){
			conn.lists = [];
			var nl = xml.getElementsByTagName('list');
			for(var i = 0; i<nl.length; i++){
				if(nl.item(i).getAttribute('archived')==0 && nl.item(i).getAttribute('deleted')==0){
//					log('adding list: '+nl.item(i).getAttribute('name'));
					conn.lists.push({
						id: nl.item(i).getAttribute('id'),
						name: nl.item(i).getAttribute('name'),
						locked: nl.item(i).getAttribute('locked')!=0,
						smart: nl.item(i).getAttribute('smart')!=0
					});
				}
			}
			if(conn.listsUpdated)
				conn.listsUpdated(conn.lists);
			if(ok)
				ok(conn.lists);
		}, error: error
	});
}

conn.getSettings = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.settings.getList'),
		sync: true,
		ok: function(xml){
			var df = xml.getElementsByTagName('dateformat');
			var tf = xml.getElementsByTagName('timeformat');
			if(ok)
			ok({
				dateformat: df.length>0? (df.item(0).firstChild.nodeValue=='0'? 'j/n': 'n/j'): 'n/j',
				timeformat: tf.length>0? (tf.item(0).firstChild.nodeValue=='0'? 'g:i a': 'G:i'): 'g:i a'
			});
		}
	});
};

conn.getLocations = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.locations.getList'),
		ok: function(xml){
			conn.locations = [];
			var nl = xml.getElementsByTagName('location');
			for(var i = 0; i<nl.length; i++){
//				log('adding location: '+nl.item(i).getAttribute('name'), nl.item(i).getAttribute('address'));
				conn.locations.push({
					id: nl.item(i).getAttribute('id'),
					name: nl.item(i).getAttribute('name'),
					address: nl.item(i).getAttribute('address'),
					longitude: nl.item(i).getAttribute('longitude'),
					latitude: nl.item(i).getAttribute('latitude'),
					zoom: nl.item(i).getAttribute('zoom')
				});
			}
			if(ok)
				ok(conn.locations);
		}, error: error
	});
};

conn.getList = function(l, searchString, ok, error){
	if(!l)
		l = {
			id: null,
			smart: false
		};
	conn.list = [];
	this.makeQuery({
		url: this.buildURL({
			list_id: l.id,
			filter: searchString? searchString: l.smart? null: 'status:incomplete'
		}, 'rtm.tasks.getList'),
		ok: function(xml){
			var list = xml.getElementsByTagName('list');
			var zoneOffset = parseInt(new Date().format('Z'));
//			log('Zone offset = '+zoneOffset);
			for(var index = 0; index<list.length; index++){
				var nl = list.item(index).childNodes;
				for(var i = 0; i<nl.length; i++){
					var s = nl.item(i);
					if(s.nodeName=='taskseries'){
						var task = {
							list_id: list.item(index).getAttribute('id'),
							series_id: s.getAttribute('id'),
							name: s.getAttribute('name'),
							location_id: s.getAttribute('location_id'),
							source: s.getAttribute('source'),
							repeat: s.getElementsByTagName('rrule').length>0
						};
						var t = s.getElementsByTagName('task').item(0);
						if(!t)
							continue;
						task.completed = t.getAttribute('completed')!='';
						task.deleted = t.getAttribute('deleted')!='';
						var due = t.getAttribute('due');
						if(due!=''){
							task.due = Date.parseDate(due, 'Y-m-d\\TH:i:s\\Z');
							if(task.due){
								task.due = task.due.add(Date.SECOND, zoneOffset);
							}
							task.hasTime = t.getAttribute('has_due_time')!='0';
						}else{
							task.due = null;
							task.hasTime = false;
						}
						task.priority = parseInt(t.getAttribute('priority')=='N'? 4: t.getAttribute('priority'));
						task.estimate = t.getAttribute('estimate');
						task.id = t.getAttribute('id')
//						log('Task', task.id, task.series_id, task.name, task.source, task.completed,
//								  task.deleted, task.priority, task.estimate, task.due, task.hasTime);
						var tags = s.getElementsByTagName('tag');
						task.tags = [];
						for(var j = 0; j<tags.length; j++){
							task.tags.push(tags.item(j).firstChild.nodeValue);
//							log('Tag', task.tags[j]);
						}
						var notes = s.getElementsByTagName('note');
						task.notes = [];
						for(var j = 0; j<notes.length; j++){
							task.notes.push({
								id: notes.item(j).getAttribute('id'),
								title: notes.item(j).getAttribute('title'),
								body: notes.item(j).firstChild.nodeValue
							});
//							log('Note', task.notes[j].id, task.notes[j].title);
						}

						conn.list.push(task);
					}
				}
			}
			if(ok)
				ok(conn.list);
		}, error: error
	})
};

conn.rollback = function(ok){
	for(var i = conn.transactions.length-1; i>=0; i--){
		log('Rollback transaction ', i, conn.transactions[i]);
		this.makeQuery({
			sync: true,
			url: this.buildURL({
				timeline: conn.timeline,
				transaction_id: conn.transactions[i]
			}, 'rtm.transactions.undo')
		});
	}
	conn.transactions = [];
	if(ok)
		ok();
}

conn.addTransaction = function(xml){
//	log('conn.addTransaction check xml with', conn.timeline);
	if(conn.timeline){
		var tr = xml.getElementsByTagName('transaction');
		if(tr.length<1)
			return;
//		if(tr.item(0).getAttribute('undoable')!='1')
//			return;
		conn.transactions.push(tr.item(0).getAttribute('id'));
		log('added transaction '+conn.transactions[conn.transactions.length-1], 'total', conn.transactions.length);
	}
}

conn.createTimeline = function(ok, error){
	this.makeQuery({
		sync: false,
		url: this.buildURL({}, 'rtm.timelines.create'),
		ok: function(xml){
			conn.timeline = xml.getElementsByTagName('timeline').item(0).firstChild.nodeValue;
			conn.transactions = [];
			log('New timeline has started', conn.timeline);
			if(ok){
				ok(conn.timeline);
			}
		}, error: error});
};

conn.addTask = function(timeline, name, list_id, ok, error){
	this.makeQuery({
		url: this.buildURL({
			timeline: timeline,
			list_id: list_id>0? list_id: null,
			name: name,
			parse: true
		}, 'rtm.tasks.add'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok({
					id: xml.getElementsByTagName('task').item(0).getAttribute('id'),
					series_id: xml.getElementsByTagName('taskseries').item(0).getAttribute('id'),
					list_id: xml.getElementsByTagName('list').item(0).getAttribute('id')
				});
		}, error: error});
};

conn.addSmartList = function(timeline, name, filter, ok, error){
	this.makeQuery({
		url: this.buildURL({
			timeline: timeline,
			name: name,
			filter: filter
		}, 'rtm.lists.add'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok({
					id: xml.getElementsByTagName('list').item(0).getAttribute('id'),
					name: xml.getElementsByTagName('list').item(0).getAttribute('name')
				});
		}, error: error});
};

conn.setTags = function(timeline, task, tags, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			tags: tags
		}, 'rtm.tasks.setTags'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.setEstimate = function(timeline, task, estimate, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			estimate: estimate
		}, 'rtm.tasks.setEstimate'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.setLocation = function(timeline, task, location, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			location_id: location
		}, 'rtm.tasks.setLocation'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.addNote = function(timeline, task, title, body, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			note_title: title || '',
			note_text: body || ''
		}, 'rtm.tasks.notes.add'),
		ok: function(xml){
			var note = xml.getElementsByTagName('note').item(0);
			if(note){
				task.notes.push({
					id: note.getAttribute('id'),
					title: note.getAttribute('title'),
					body: note.firstChild.nodeValue
				});
			}
			conn.addTransaction(xml);
			if(ok)
				ok(task.notes[task.notes.length-1]);
		}, error: error});
};

conn.editNote = function(timeline, task, note, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			note_id: note.id,
			note_title: note.title || '',
			note_text: note.body || ''
		}, 'rtm.tasks.notes.edit'),
		ok: function(xml){
			var n = xml.getElementsByTagName('note').item(0);
			if(n){
				note.title = n.getAttribute('title'),
				note.body = n.firstChild.nodeValue
			}
			conn.addTransaction(xml);
			if(ok)
				ok(note);
		}, error: error});
};

conn.deleteNote = function(timeline, task, note, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			note_id: note.id
		}, 'rtm.tasks.notes.delete'),
		ok: function(xml){
			conn.addTransaction(xml);
			for(var i = 0; i<task.notes.length; i++){
				if(task.notes[i].id==note.id){
					task.notes.splice(i, 1);
					break;
				}
			}
			if(ok)
				ok(note);
		}, error: error});
};

conn.setPriority = function(timeline, task, priority, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			priority: priority
		}, 'rtm.tasks.setPriority'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.setRecurrence = function(timeline, task, repeat, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			repeat: repeat
		}, 'rtm.tasks.setRecurrence'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.setName = function(timeline, task, name, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			name: name
		}, 'rtm.tasks.setName'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.setDueDate = function(timeline, task, due, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			parse: 1,
			due: due
		}, 'rtm.tasks.setDueDate'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.deleteTask = function(timeline, task, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id
		}, 'rtm.tasks.delete'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.postpone = function(timeline, task, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id
		}, 'rtm.tasks.postpone'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.setList = function(timeline, task, list_id, ok, error){
	this.makeQuery({
		sync: true,
		url: this.buildURL({
			timeline: timeline,
			from_list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id,
			to_list_id: list_id
		}, 'rtm.tasks.moveTo'),
		ok: function(xml){
			conn.addTransaction(xml);
			if(ok)
				ok();
		}, error: error});
};

conn.complete = function(timeline, task, ok, error){
	this.makeQuery({
		sync: false,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id
		}, 'rtm.tasks.complete'),
		ok: function(xml){
			conn.addTransaction(xml);
			var g = xml.getElementsByTagName('generated');
			if(g.length>0){
				var t = g.item(0).getElementsByTagName('task');
				if(t.length>0)
					task.id = t.item(0).getAttribute('id');
			}
			if(ok)
				ok(task);
		}, error: error});
};

var sql = {};
sql.init = function(){
	this.conn = Ext.data.SqlDB.getInstance();
	this.conn.open('rtm.db');
	this.timeRecord = Ext.data.Record.create([
		{name: 'task_id', type:'int'},
		{name: 'seconds', type:'int'}
	]);
	var proxy = new Ext.data.SqlDB.Proxy(this.conn, 'time', 'task_id', {
		recordType: this.timeRecord,
		idIndex: 0
	});
	this.timeStore = proxy.store;
	this.timeStore.load();
	this.backgroundRecord = Ext.data.Record.create([
		{name: 'taskseries_id', type:'int'},
		{name: 'background', type:'int'}
	]);
	var backgroundProxy = new Ext.data.SqlDB.Proxy(this.conn, 'backgrounds', 'taskseries_id', {
		recordType: this.backgroundRecord,
		idIndex: 0
	});
	this.backgroundStore = backgroundProxy.store;
	this.backgroundStore.load();
};

sql.isBackground = function(seriesID){
	var rec = this.backgroundStore.getById(seriesID);
	if(rec)
		return true;
	return false;
}

sql.setBackground = function(seriesID, background){
	var rec = this.backgroundStore.getById(seriesID);
	if(rec && !background)
		this.backgroundStore.remove(rec);
	if(!rec && background)
		this.backgroundStore.add(new this.backgroundRecord({
			taskseries_id: seriesID,
			background: 1
		}));
}

sql.getSeconds = function(taskID){
	//First, iterate over all records
	//for(var i = 0; i < this.timeStore.getCount(); i++){
	//	log('Now in DB: ', this.timeStore.getAt(i).get('task_id'), this.timeStore.getAt(i).get('seconds'));
	//}
	var rec = this.timeStore.getById(taskID);
	if(rec)
		return rec.get('seconds');
	return 0;
}
sql.saveSeconds = function(taskID, seconds){
	var rec = this.timeStore.getById(taskID);
	if(rec)
		rec.set('seconds', seconds);
	else{
		this.timeStore.add(new this.timeRecord({
			task_id: taskID,
			seconds: seconds
		}));
	}
}
sql.deleteSeconds = function(taskID){
	var rec = this.timeStore.getById(taskID);
	if(rec)
		this.timeStore.remove(rec);
}
