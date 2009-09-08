var fileconn = {};
fileconn.start = null;
fileconn.fileName = null;
fileconn.end = null;
fileconn.lists = [];
fileconn.locations = [];
fileconn.timeline = null;
fileconn.activeCount = 0;
fileconn.fileIndex = 0;
fileconn.list = [];
fileconn.dateformat = 'n/j/y';
fileconn.timeformat = 'g:i a';
fileconn.dateFormats = ['n/j/y', 'n/j', 'j/n', 'j/n/y', ''];
fileconn.timeFormats = [' g:i a', ' g:ia', ' g a', ' ga', ' G:i', ' G', ''];

fileconn.precompileDateFormats = function(){
	for(var i = 0; i<this.dateFormats.length; i++){
		for(var j = 0; j<this.timeFormats.length; j++){
			var format = this.dateFormats[i]+this.timeFormats[j];
			if(!format)
				continue;
			Date.createFormat(format.trim());
			Date.createParser(format.trim());
		}
	}
}

fileconn.precompileDateFormats();

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

fileconn.readFile = function(stream){
	try{
		var data = stream.readUTFBytes(stream.bytesAvailable);
		data = data.replace(/\n/g, '');
		var arr = splitWith(data, '\r');
		var result = [];
		for(var i = 0; i<arr.length; i++){
			if(arr[i].startsWith('\r')){
				for(var j = 1; j<arr[i].length; j++){
					result.push('');
				}
			}else{
				result.push(arr[i]);
			}
		}
		stream.close();
		return result;
	}catch(e){

	}
	return [];
}

fileconn.startWriteFile = function(){
	try{
		var file = new air.File(this.fileName+'.'+(this.fileIndex++));
		var stream = new air.FileStream();
		stream.open(file, 'write');
		return {
			stream: stream,
			file: file
		};
	}catch(e){
		log('exception', e);
	}
	return null;
};

fileconn.writeLine = function(stream, data){
	if(!stream)
		return false;
	try{
//		log('writeLine: ', stream.position, data);
		if(stream.position>0){
			stream.writeByte(13);
		}
		stream.writeUTFBytes(data);
		return true;
	}catch(e){

	}
	return false;
}

fileconn.commitWriting = function(data){
	try{
		data.stream.close();
		var moveTo = new air.File(this.fileName);
		try{
			var back = new air.File(this.fileName+'.backup');
			moveTo.moveTo(back, true);
		}catch(e1){

		}
		data.file.moveTo(moveTo, true);
		return true;
	}catch(e){

	}
	return false;
};

fileconn.getLists = function(ok, error){
	log('fileconn getLists');
	var stream = this.startReadFile();
//	log('stream', stream);
	var line = null;
	this.lists = [];
	var lines = this.readFile(stream);
	for(var i = 0; i<lines.length; i++){
		line = lines[i];
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

fileconn.getDueDate = function(due_text){
	if(!due_text)
		return null;
	var d = null;
	try{
		d = Date.parseDate(due_text, this.dateformat+' '+this.timeformat, true);
	}catch(e){

	}
	if(d){
		return {
			date: d,
			hasTime: true
		};
	}else{
		try{
			d = Date.parseDate(due_text, this.dateformat, true);
		}catch(e){
			d = null;
		}
		if(d){
			return {
				date: d,
				hasTime: false
			};
		}
	}
	return null;
};

fileconn.parseFilter = function(data){
	//First, split by spaces
	var instance = this;
	var arr = splitWith(data, ' ', true);
	log('parseFilter split', arr.length, arr);
	var index = -1;

	var charCount = function(data, ch){
		var startFrom = -1;
		var count = 0;
		do{
			startFrom = data.indexOf(ch, startFrom+1);
			if(startFrom!=-1)
				count++;
		}while(startFrom!=-1);
		return count;
	}

	var nextWord = function(){
		var result = '';
		if(index>=arr.length-1)
			return null;
		result += arr[++index];
		if(result.startsWith('(')){
			var bracesCount = 0;
			result = '';
			index--;
			do{
				result += arr[++index]+' ';
				bracesCount += charCount(arr[index], '(');
				bracesCount -= charCount(arr[index], ')');
			}while(bracesCount>0 && index<arr.length-1);
		}
		return result.trim();
	}
	var word = null;
	var result = [];
	var words = [];
	while((word = nextWord())!=null){
		log('parseFilter add word', word);
		words.push(word);
	}

	var SIGN_EQ = 0;
	var SIGN_GR = 1;
	var SIGN_LS = 2;

	var normalizeQuery = function(data){
		if(!data)
			data = '';
		data = data.trim();
		if(data.startsWith('"') && data.endsWith('"'))
			data = data.substr(1, data.length-2).trim();
		if(data.startsWith('>'))
			return {
				sign: SIGN_GR,
				value: data.substr(1).trim()
			};
		if(data.startsWith('<'))
			return {
				sign: SIGN_LS,
				value: data.substr(1).trim()
			};
		return {
			sign: SIGN_EQ,
			value: data
		};
	};
	for(var i = 0; i<words.length; i++){
		word = words[i];
		if(word.startsWith('(') && word.endsWith(')')){
			var res = this.parseFilter(word.substr(1, word.length-2));
			result.push(res);
		}
		if(word.startsWith('"') && word.endsWith('"')){
			word = 'name:'+word;
		}
		if(word=='NOT' || word=='AND' || word=='OR'){
			result.push(word);
		}
		if(word.startsWith('list:')){
			result.push({
				value: normalizeQuery(word.substr(5)),
				handler: function(data, task, value){
//					log('check list', task.list_id, data.value.value);
					return task.list_id.startsWith(data.value.value.toLowerCase());
				}
			});
		}
		if(word.startsWith('tag:')){
			result.push({
				value: normalizeQuery(word.substr(4)),
				handler: function(data, task, value){
					log('check tags', task.tags.length, data.value.value);
					for(var j = 0; j<task.tags.length; j++){
						log('check tag', task.tags[j], data.value.value);
						if(task.tags[j].toLowerCase()==data.value.value.toLowerCase())
							return true;
					}
					return false;
				}
			});
		}
		if(word.startsWith('isTagged:')){
			result.push({
				value: normalizeQuery(word.substr(9)),
				handler: function(data, task, value){
					return data.value.value=='true'? task.tags.length>0: task.tags.length==0;
				}
			});
		}
		if(word.startsWith('status:')){
			result.push({
				value: normalizeQuery(word.substr(7)),
				handler: function(data, task, value){
					if(data.value.value=='completed' && !task.completed)
						return false;
					if(data.value.value=='incomplete' && task.completed)
						return false;
					return true;
				}
			});
		}
		if(word.startsWith('location:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(9)),
				handler: function(data, task, value){
//					log('check location', task.location, data.value.value);
					return task.location? task.location.toLowerCase().indexOf(data.value.value.toLowerCase())!=-1: false;
				}
			});

		}
		if(word.startsWith('isLocated:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(10)),
				handler: function(data, task, value){
//					log('check location', task.location, data.value.value);
					return task.location? data.value.value=='true': data.value.value=='false';
				}
			});

		}
		if(word.startsWith('isRepeating:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(12)),
				handler: function(data, task, value){
//					log('check location', task.location, data.value.value);
					return task.repeat? data.value.value=='true': data.value.value=='false';
				}
			});

		}
		if(word.startsWith('timeEstimate:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(13)),
				handler: function(data, task, value){
					var valueSec = instance.parseEstimate(data.value.value);
					var taskSec = instance.parseEstimate(task.estimate);
//					log('check location', task.location, data.value.value);
					return data.value.sign==SIGN_LS? taskSec<valueSec:
							data.value.sign==SIGN_GR? taskSec>valueSec:
							valueSec==taskSec;
				}
			});
		}
		if(word.startsWith('priority:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(9)),
				handler: function(data, task, value){
					if(data.value.value=='none')
						return task.priority==4;
					var pr = parseInt(data.value.value);
					if(isNaN(pr))
						pr = 3;
					return data.value.sign==SIGN_LS? task.priority<pr:
							data.value.sign==SIGN_GR? task.priority>pr:
							task.priority==pr;
				}
			});
		}
		if(word.startsWith('due:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(4)),
				handler: function(data, task, value){
					if(data.value.value=='never')
						return task.due? false: true;
					if(!task.due)
						return false;
					var valDate = instance.normalizeDue(data.value.value);
					var parsedVal = instance.getDueDate(valDate);
					if(!parsedVal)
						return false;
//					log('due:', task.due, parsedVal.hasTime, parsedVal.date, task.due.getTime()==parsedVal.date.getTime());
					return parsedVal.hasTime? task.due.getTime()==parsedVal.date.getTime(): daysBetween(task.due, parsedVal.date)==0;
				}
			});
		}

		if(word.startsWith('dueBefore:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(10)),
				handler: function(data, task, value){
					if(!task.due)
						return false;
					var valDate = instance.normalizeDue(data.value.value);
					log('dueBefore:', valDate);
					var parsedVal = instance.getDueDate(valDate);
					if(!parsedVal)
						return false;
					log('dueBefore:', valDate, task.due, parsedVal.hasTime, parsedVal.date, task.due.getTime()==parsedVal.date.getTime());
					return parsedVal.hasTime? task.due.getTime()<parsedVal.date.getTime(): daysBetween(task.due, parsedVal.date)<0;
				}
			});
		}

		if(word.startsWith('dueAfter:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.substr(9)),
				handler: function(data, task, value){
					if(!task.due)
						return false;
					var valDate = instance.normalizeDue(data.value.value);
					var parsedVal = instance.getDueDate(valDate);
					if(!parsedVal)
						return false;
//					log('dueBefore:', task.due, parsedVal.hasTime, parsedVal.date, task.due.getTime()==parsedVal.date.getTime());
					return parsedVal.hasTime? task.due.getTime()>parsedVal.date.getTime(): daysBetween(task.due, parsedVal.date)>0;
				}
			});
		}

		if((i==0 && result.length==0) || word.startsWith('name:')){
			//Add as a name
			result.push({
				value: normalizeQuery(word.startsWith('name:')? word.substr(5): data),
				handler: function(data, task, value){
//					log('check name', task.text, data.value.value);
					return task.text.toLowerCase().indexOf(data.value.value.toLowerCase())!=-1;
				}
			});

		}
	}

	for(var i = 0; i<result.length; i++){
		var r = result[i];
//		log('check log operations', i, result.length, r);
		if(r=='NOT'){
			result.splice(i, 2, {
				value: result[i+1],
				handler: function(data, task, value){
					var res1 = data.value? instance.checkFilter(data.value, task): false;
//					log('exec not', data.value, res1);
					return !res1;
				}
			});
		}
		if(r=='AND'){
			result.splice(i==0? i: i-1, i==0? 2: 3, {
				value: result[i-1],
				value2: result[i+1],
				handler: function(data, task, value){
					var res1 = data.value? instance.checkFilter(data.value, task): true;
					var res2 = data.value2? instance.checkFilter(data.value2, task): true;
//					log('exec and', data.value, data.value2, res1, res2);
					return res1 && res2;
				}
			});
		}
		if(r=='OR'){
			result.splice(i==0? i: i-1, i==0? 2: 3, {
				value: result[i-1],
				value2: result[i+1],
				handler: function(data, task, value){
					var res1 = data.value? instance.checkFilter(data.value, task): true;
					var res2 = data.value2? instance.checkFilter(data.value2, task): true;
					log('exec or', data.value, data.value2, res1, res2);
					return res1 || res2;
				}
			});
		}
	}
	if(result.length==1)
		return result[0];
	else
		return null;
}

fileconn.checkFilter = function(filter, task){
//	log('check filter', filter, task.id);
	var result = false;
	if(filter && filter.handler){
		result = filter.handler(filter, task);
	}
	return result;
}

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
	var lines = this.readFile(stream);
	var f = this.parseFilter(filter);
	for(var ind = 0; ind<lines.length; ind++){
		line = lines[ind];
		if(line.indexOf('=')==0){
			//List here
			list = line.substr(1, line.indexOf('|')==-1? line.length: line.indexOf('|')-1);
		}
		if(line.indexOf('-')==0 || line.indexOf('+')==0){
			//Task here
			var task = parseQuickAdd(line.substr(1));
			if(line.indexOf('+')==0)
				task.completed = true;
			task.id = task.text;
			task.name = task.text;
			task.list_id = list.toLowerCase();
			task.series_id = task.text;
			task.notes = [];
			if(task.due_text){
				//Calculate due here
				var d = null;
				try{
					d = Date.parseDate(task.due_text, this.dateformat+' '+this.timeformat, true);
				}catch(e){

				}
				if(d){
					task.due = d;
					task.hasTime = true;
				}else{
					try{
						d = Date.parseDate(task.due_text, this.dateformat, true);
					}catch(e){
						d = null;
					}
					if(d){
						task.due = d;
					}
				}
			}
			line = lines[++ind];//Check next line - maybe note there
			if(line && line.startsWith('|')){
				//Note there
				note = '';
				do{
					var startSensitive = false;
					if(line.startsWith('|')){
						line = line.substr(1);
					}
					if(line && line.lastIndexOf('|')==line.length-1){
						//End of note
						startSensitive = true;
						note += line.substr(0, line.length-1);
						if(note)
							var firstEnter = note.indexOf('\n');
							var title = firstEnter!=-1? note.substr(0, firstEnter).trim(): '';
							var body = firstEnter!=-1? note.substr(firstEnter).trim(): note.trim();
							task.notes.push({
								id: generateRandomString(8),
								body: body,
								title: title
							});
						note = '';
					}else{
						note += line.trim()+'\n';
					}
					line = lines[++ind];
					if(startSensitive && line && line.indexOf('|')!=0){//Stop notes
						ind--;
						break;
					}
				}while(line!=null);
			}else{
				//Not a note - step back
				ind--;
			}
			//Task is ready to add - no due
//			log('Ready to add task: ', task.id,
//				'list', task.list_id,
//				'tags', task.tags.length,
//				'repeat', task.repeat,
//				'due', task.due_text,
//				'notes', task.notes.length,
//				'priority', task.priority,
//				'estimate',task.estimate);
			if(!this.checkFilter(f, task))
				continue;
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
	if(ok)
		ok(this.timeline);
};

fileconn.normalizeDue = function(data){
	data = data.toLowerCase().trim();
	var result = '';
	var weekDays = ['monday', 'mon',
					'tuesday', 'tue',
					'wednesday', 'wed',
					'thursday', 'thu',
					'friday', 'fri',
					'saturday', 'sat',
					'sunday', 'sun'];
	var today = new Date();
	var nowDay = parseInt(today.format('N'))-1;
	if(data.indexOf('tod')==0){
//		log('found today');
		data = data.replace(/^today|tod/, today.format(this.dateformat));
	}
	if(data.indexOf('yesterday')==0){
//		log('found yesterday');
		var yest = today.add(Date.DAY, -1);
		data = data.replace(/^yesterday/, yest.format(this.dateformat));
	}
	if(data.indexOf('tom')==0){
		var tom = today.add(Date.DAY, 1);
//		log('found tomorrow');
		data = data.replace(/^tomorrow|tom/, tom.format(this.dateformat));
	}
	var next = false;
	if(data.startsWith('next ')){
		data = data.substr(5);
		next = true;
	}
	for(var i = 0; i<7; i++){
		if(data.indexOf(weekDays[2*i+1])==0){
//			log('found weekday', weekDays[2*i]);
			var week = today.add(Date.DAY, i-nowDay+(next? 7: 0));
			data = data.replace(weekDays[2*i], week.format(this.dateformat))
			data = data.replace(weekDays[2*i+1], week.format(this.dateformat))
			break;
		}
	}
	var arr = splitWith(data, ' ', true);
	var count = parseInt(arr[0]);
//	log('normDue', arr, count);
	if(count>0){
		//Check second word
		var word = arr[1];
		arr.splice(0, 2);
		var suffix = ' '+arr.join(' ');
		if(fromArray(word, ['hr', 'hrs', 'hour', 'hours'])){
			var d = today.add(Date.HOUR, count);
			data = d.format(this.dateformat+' '+this.timeformat);
		}
		if(fromArray(word, ['day', 'days'])){
			var d = today.add(Date.DAY, count);
			data = d.format(this.dateformat)+suffix;
		}
		if(fromArray(word, ['wk', 'wks', 'week', 'weeks'])){
			var d = today.add(Date.DAY, count*7);
			data = d.format(this.dateformat)+suffix;
		}
		if(fromArray(word, ['month', 'months'])){
			var d = today.add(Date.MONTH, count);
			data = d.format(this.dateformat)+suffix;
		}
	}
	data = data.trim();
//	log('normDue', data);
	for(var i = 0; i<this.dateFormats.length; i++){
		for(var j = 0; j<this.timeFormats.length; j++){
			var format = this.dateFormats[i]+this.timeFormats[j];
			if(!format)
				continue;
			try{
				var d = Date.parseDate(data, format.trim(), true);
				if(d){
					if(format.indexOf('/y')==-1){
						while(daysBetween(d, today)<0){
							d = d.add(Date.YEAR, 1);
						}
					}
					return d.format(this.dateformat+(format.indexOf(' ')!=-1? ' '+this.timeformat: ''));
				}
			}catch(e){

			}
		}
	}
	return null;
}

fileconn.normalizeRepeat = function(data){
	data = data.toLowerCase().trim();
	var arr = splitWith(data, ' ', true);
	if(!fromArray(arr[0], ['ev', 'every', 'after']))
		return null;
	if(arr[0]=='ev')
		arr[0] = 'every';
	var n = parseInt(arr[1]);
	if(isNaN(n)){
		arr.splice(1, 0, '1');
		n = 1;
	}
	if(n<1)
		arr[1] = '1';
	if(!fromArray(arr[2], ['day', 'days', 'week', 'weeks', 'wk', 'wks', 'month', 'months', 'year', 'years', 'yr', 'yrs']))
		return null;
	arr[2] = arr[2].replace(/days/, 'day')
					.replace(/weeks|wk|wks/, 'week')
					.replace(/months/, 'month')
					.replace(/years|yr|yrs/, 'year');
	arr.splice(3, arr.length);
	return arr.join(' ');
}

fileconn.parseEstimate = function(data){
	data = data.toLowerCase().replace(/hours|hour|hrs|hr/, ' hr ').replace(/mins|min/, ' min ');
	var arr = splitWith(data, ' ', true);
	var result = 0;
	if(arr[1]=='hr'){
		var hr = parseInt(arr[0]);
		if(hr>0)
			result = hr*60;
		if(arr[3]=='min'){
			result += parseInt(arr[2]);
		}
	}
	if(arr[1]=='min'){
		var min = parseInt(arr[0]);
		if(min>0)
			result = min;
	}
	return result;
}

fileconn.normalizeEstimate = function(data){
	return secondsToEstimate(this.parseEstimate(data)*60);
}

fileconn.createTask = function(tl, data, ok, error){
	//Format all fields
	//DUE load all formats
	if(data.due_text){
		data.due_text = this.normalizeDue(data.due_text);
		log('normalized due', data.due_text);
	}
	//REPEAT
	if(data.repeat){
		data.repeat = this.normalizeRepeat(data.repeat);
		log('normalized repeat', data.repeat);
	}
	//ESTIMATE
	if(data.estimate){
		data.estimate = this.normalizeEstimate(data.estimate);
		log('normalized estimate', data.estimate);
	}
	if(data.text)
		data.text = data.text.trim();
	if(!data.text){
		if(error)
			error(2, 'Task name is empty');
		return;
	}
	data.id = data.text;
	data.list_id = data.list.toLowerCase();
	//Open file for writing, start looking for list
	this.saveTask(data, false);
	if(ok){
		ok(data);
	}
};

fileconn.writeTask = function(task, stream){
	var result = task.completed? '+ ': '- ';
	result += task.text;
	for(var i = 0; i<task.tags.length; i++){
		if(task.tags[i].trim())
			result += ' #'+(task.tags[i].trim());
	}
	if(task.due_text){
		result += ' ^'+task.due_text;
	}
	if(task.location){
		result += ' @'+task.location;
	}
	if(task.repeat){
		result += ' *'+task.repeat;
	}
	if(task.estimate){
		result += ' ~'+task.estimate;
	}
	if(task.priority<4){
		result += ' !'+task.priority;
	}
	this.writeLine(stream, result);
	if(task.notes){
		for(var i = 0; i<task.notes.length; i++){
			var ntext = (task.notes[i].title? task.notes[i].title+'\n': '')+
					task.notes[i].body;
			if(!ntext)
				continue;
			var lines = ntext.split('\n');
			for(var j = 0; j<lines.length; j++){
				this.writeLine(stream, (j==0? '|': '')+lines[j]+(j==lines.length-1? '|': ''));
			}
		}
	}
}

fileconn.saveTask = function(task, deleteTask){
	var readStream = this.startReadFile();
	var wr = this.startWriteFile();
	if(!wr)
		return false;
	var line = null;
	var listFound = false;
	var taskWritten = false;
	var lines = this.readFile(readStream);
	var listName = '';
	for(var ind = 0; ind<lines.length; ind++){
		line = lines[ind];
//		log('saveTask', line);
		if(line && line.indexOf('=')==0){
			//List here
			listName = line.substr(1, line.indexOf('|')==-1? line.length: line.indexOf('|')-1).toLowerCase();
			log('saveTask found list', listName, task.list_id);
			if(listName==task.list_id)
				listFound = true;
			else{
				if(listFound && !deleteTask && !taskWritten){
					//Save task here
					this.writeTask(task, wr.stream);
					taskWritten = true;
				}
			}
		}
		if(line && (line.indexOf('-')==0 || line.indexOf('+')==0)){
			//Task here
			var t = parseQuickAdd(line.substr(1).trim());
			if(t.text==task.id){
				if(!taskWritten && !deleteTask && listName==task.list_id){
					//Save task here
					this.writeTask(task, wr.stream);
					taskWritten = true;
				}
				//Skip task here
				var l = null;
				var endOfNote = true;
				while((l = lines[++ind])!=null){
					if(endOfNote && (!l || l.indexOf('|')!=0)){
						//Next line here
						ind--;
						break;
					}
					endOfNote = false;
					if(l && l.lastIndexOf('|')==l.length-1){
						//May be end of note
						endOfNote = true;
					}
				}
				continue;
			}
		}
		this.writeLine(wr.stream, line);
	}
	if(!taskWritten && !deleteTask){
//		if(task.list_id && task.list_id.trim())
//			this.writeLine(wr.stream, '='+task.list_id);
		this.writeTask(task, wr.stream);
		taskWritten = true;
	}
	this.commitWriting(wr);
	return true;
}

fileconn.addSmartList = function(timeline, name, filter, ok, error){
	var readStream = this.startReadFile();
	var wr = this.startWriteFile();
	if(!wr || !name){
		if(error)
			error(3, 'Can\'t write to file '+this.fileName);
		return;
	}
	var line = null;
	var listFound = false;
	var lines = this.readFile(readStream);
	for(var ind = 0; ind<lines.length; ind++){
		line = lines[ind];
		this.writeLine(wr.stream, line);
		if(line && line.indexOf('=')==0){
			//List here
			listName = line.substr(1, line.indexOf('|')==-1? line.length: line.indexOf('|')-1).toLowerCase();
			if(listName==name.toLowerCase()){
				listFound = true;
			}
		}
	}
	if(!listFound){
		this.writeLine(wr.stream, '='+name+(filter? '|'+filter: ''));
	}
	this.commitWriting(wr);
	if(ok)
		ok(name);
};

fileconn.setTags = function(timeline, task, tags, ok, error){
	task.tags = (tags || '').split(',');
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.setEstimate = function(timeline, task, estimate, ok, error){
	task.estimate = null;
	if(estimate)
		task.estimate = this.normalizeEstimate(estimate)
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.setLocation = function(timeline, task, location, ok, error){
	task.location = location;
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.addNote = function(timeline, task, title, body, ok, error){
	var note = {
		id: generateRandomString(8),
		title: title,
		body: body
	};
	task.notes.push(note);
	this.saveTask(task, false);
	if(ok){
		ok(note);
	}
};

fileconn.editNote = function(timeline, task, note, ok, error){
	this.saveTask(task, false);
	if(ok){
		ok(note);
	}
};

fileconn.deleteNote = function(timeline, task, note, ok, error){
	for(var i = 0; i<task.notes.length; i++){
		if(task.notes[i]==note){
			task.notes.splice(i, 1);
			break;
		}
	}
	this.saveTask(task, false);
	if(ok){
		ok(note);
	}
};

fileconn.setPriority = function(timeline, task, priority, ok, error){
	task.priority = priority;
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.setRecurrence = function(timeline, task, repeat, ok, error){
	task.repeat = null;
	if(repeat)
		task.repeat = this.normalizeRepeat(repeat);
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.setName = function(timeline, task, name, ok, error){
	task.text = name;
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.setDueDate = function(timeline, task, due, ok, error){
	task.due_text = null;
	if(due)
		task.due_text = this.normalizeDue(due)
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.deleteTask = function(timeline, task, ok, error){
	this.saveTask(task, true);
	if(ok){
		ok(task);
	}
};

fileconn.postpone = function(timeline, task, ok, error){
	//Process due date here
	var due = this.getDueDate(task.due_text);
	if(due){
		var startDate = due.date;
		startDate = startDate.add(Date.DAY, 1);
		task.completed = false;
		task.due_text = startDate.format(this.dateformat+(due.hasTime? ' '+this.timeformat: ''));
	}
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.setList = function(timeline, task, list_id, ok, error){
	task.list_id = list_id.toLowerCase();
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.complete = function(timeline, task, ok, error){
	//Process due date and repeat here
	task.completed = true;
	var due = this.getDueDate(task.due_text);
	if(due && task.repeat){
		var arr = splitWith(task.repeat.toLowerCase(), ' ', true);
		if(arr.length==3){
			var nowDate = new Date();
			var startDate = arr[0].toLowerCase()=='after'? nowDate: due.date;
			var howMany = parseInt(arr[1]);
			var constantType = arr[2]=='day'? Date.DAY:
							  arr[2]=='week'? Date.DAY:
							  arr[2]=='month'? Date.MONTH:
							  arr[2]=='year'? Date.YEAR: -1;
			if(isNaN(howMany))
				howMany = 1;
			if(arr[2]=='week'){
				howMany *= 7;
			}
			if(constantType!=-1){
				do{
//					log('add', howMany, arr[2], constantType, 'to', startDate.format(this.dateformat+' '+this.timeformat));
					startDate = startDate.add(constantType, howMany);
				}while(startDate.getTime()<nowDate.getTime());
				task.completed = false;
				task.due_text = startDate.format(this.dateformat+(due.hasTime? ' '+this.timeformat: ''));
			}else{
				log('wrong constant', arr[2]);
			}
		}else{
			log('wrong repeat', task.repeat);
		}
	}else{
		log('not due or not repeat', task.due_text, task.repeat, due);
	}
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};

fileconn.uncomplete = function(timeline, task, ok, error){
	task.completed = false;
	this.saveTask(task, false);
	if(ok){
		ok(task);
	}
};
