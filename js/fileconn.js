var fileconn = {};
fileconn.start = null;
fileconn.fileName = null;
fileconn.end = null;
fileconn.lists = [];
fileconn.locations = [];
fileconn.timeline = null;
fileconn.activeCount = 0;
fileconn.list = [];


fileconn.getTaskFromList = function(id){
	for(var i = 0; i<this.list.length; i++){
		if(this.list[i].id==id)
			return this.list[i];
	}
	return null;
}

fileconn.active = function(){
	return this.activeCount>0;
}


fileconn.checkToken = function(ok, error){
	try{
		var file = new air.File(this.fileName);
		if(file.exists && !file.isDirectory){
			if(ok)
				ok({});
			return;
		}
	}catch(e){

	}
	if(error)
		error(1, 'Can\'t find file');
}

fileconn.getFrob = function(ok, error){
}

fileconn.getToken = function(ok, error){
}

fileconn.startReadFile = function(){
	try{
		var file = new air.File(this.fileName);
		if(file.exists && !file.isDirectory){
			var stream = new air.FileStream();
			stream.open(file, 'read');
			return stream;
		}

	}catch(e){
		log('exception', e);
	}
	return null;
};

fileconn.nextLine = function(stream){
	if(!stream)
		return null;
	//read byte by byte here
	try{
		var result = '';
		var ch = null;
		while(stream.bytesAvailable>0 && (ch = stream.readUTFBytes(1))){
			if(ch=='\r')
				continue;
			if(ch=='\n')
				return result;
			result += ch;
		}
		stream.close();
		return result==''? null: result;
	}catch(e){
//		log('exception', e);
	}
	return null;
}

fileconn.getLists = function(ok, error){
	log('fileconn getLists');
	var stream = this.startReadFile();
//	log('stream', stream);
	var line = null;
	this.lists = [];
	while((line = this.nextLine(stream))!=null){
//		log('line', line);
		if(line.indexOf('=')==0){
			//We found list
			var list = {
				smart: false
			};
			var name = line.substr(1).trim();
			if(name.indexOf('|')!=-1){
				list.smart = true;
				list.filter = name.substr(name.indexOf('|')+1);
				name = name.substr(0, name.indexOf('|'));
			}
			list.id = name;
			list.name = name;
			this.lists.push(list);
		}
	}
	if(listsUpdated)
		listsUpdated(this.lists);
	if(ok)
		ok(this.lists);
}

fileconn.getSettings = function(ok, error){
	if(ok)
		ok({
			dateformat: 'n/j',
			timeformat: 'g:i a'
		});
};

fileconn.getLocations = function(ok, error){
	if(ok)
		ok(this.locations);
	return;
};

fileconn.getList = function(l, searchString, ok, error){
	if(!l)
		l = {
			id: null,
			smart: false
		};
	this.list = [];
	var filter = searchString? searchString: l.smart? l.filter: ('status:incomplete AND list:'+l.id);
	//Prepare filter here

	var stream = this.startReadFile();
	var line = null;
	var list = null;
	while((line = line==null? this.nextLine(stream): line)!=null){
		if(line.indexOf('=')==0){
			//List here
			list = line.substr(0, line.indexOf('|')==-1? line.length: line.indexOf('|'));
		}
		if(line.indexOf('-')==0 || line.indexOf('+')==0){
			//Task here
			var task = parseQuickAdd(line.substr(1));
			if(line.indexOf('+')==0)
				task.completed = true;
			task.id = task.text;
			task.name = task.text;
			task.list_id = list;
			task.series_id = task.text;
			task.notes = [];
			if(task.due_text){
				//Calculate due here
				var d = null;
				try{
					d = Date.parseDate(task.due_text, dateFormat+'/y '+timeFormat, true);
				}catch(e){

				}
				if(d){
					task.due = d;
					task.hasTime = true;
				}else{
					try{
						d = Date.parseDate(task.due_text, dateFormat+'/y', true);
					}catch(e){
						d = null;
					}
					if(d){
						task.due = d;
					}
				}
			}
			line = this.nextLine(stream);//Check next line - maybe note there
			if(line && line.indexOf('|')==0){
				//Note there
				note = '';
				do{
					var startSensitive = false;
					if(line.indexOf('|')==0){
						line = line.substr(1);
					}
					if(line.indexOf('|')==line.length-1){
						//End of note
						startSensitive = true;
						note += line.substr(0, line.length-1);
						if(note)
							var firstEnter = note.indexOf('\n');
							var title = firstEnter!=-1? note.substr(0, firstEnter).trim(): '';
							var body = firstEnter!=-1? note.substr(firstEnter).trim(): note.trim();
							task.notes.push({
								id: task.notes.length,
								body: body,
								title: title
							});
						note = '';
					}else{
						note += line.trim()+'\n';
					}
					line = this.nextLine(stream);
					if(startSensitive && line && line.indexOf('|')!=0){//Stop notes
						break;
					}
				}while(line!=null);
			}
			//Task is ready to add - no due
			log('Ready to add task: ', task.id,
				'list', task.list_id,
				'tags', task.tags.length,
				'repeat', task.repeat,
				'due', task.due_text,
				'notes', task.notes.length,
				'priority', task.priority,
				'estimate',task.estimate);
			this.list.push(task);
			continue;
		}
		line = null;
	}
	if(ok)
		ok(this.list);
};

fileconn.rollback = function(ok){
	if(ok)
		ok();
}

fileconn.addTransaction = function(xml){
}

fileconn.createTimeline = function(ok, error){
	this.timeline = 0;
	if(ok){
		ok(this.timeline);
};

fileconn.addTask = function(timeline, name, list_id, ok, error){
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

fileconn.addSmartList = function(timeline, name, filter, ok, error){
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

fileconn.setTags = function(timeline, task, tags, ok, error){
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

fileconn.setEstimate = function(timeline, task, estimate, ok, error){
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

fileconn.setLocation = function(timeline, task, location, ok, error){
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

fileconn.addNote = function(timeline, task, title, body, ok, error){
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

fileconn.editNote = function(timeline, task, note, ok, error){
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

fileconn.deleteNote = function(timeline, task, note, ok, error){
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

fileconn.setPriority = function(timeline, task, priority, ok, error){
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

fileconn.setRecurrence = function(timeline, task, repeat, ok, error){
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

fileconn.setName = function(timeline, task, name, ok, error){
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

fileconn.setDueDate = function(timeline, task, due, ok, error){
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

fileconn.deleteTask = function(timeline, task, ok, error){
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

fileconn.postpone = function(timeline, task, ok, error){
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

fileconn.setList = function(timeline, task, list_id, ok, error){
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

fileconn.complete = function(timeline, task, ok, error){
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

fileconn.uncomplete = function(timeline, task, ok, error){
	this.makeQuery({
		sync: false,
		url: this.buildURL({
			timeline: timeline,
			list_id: task.list_id,
			taskseries_id: task.series_id,
			task_id: task.id
		}, 'rtm.tasks.uncomplete'),
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
