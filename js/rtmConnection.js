var conn = {};
conn.apiKey = '6a0f2df056721fb0f6ec9dfd04973053';
conn.secret = '7fafbe6a8c6ff6b7';
conn.start = null;
conn.end = null;
conn.authToken = '';
conn.lists = [];
conn.locations = [];

conn.buildURL = function(data, method, aURL){
	if(!aURL)
		aURL = 'http://api.rememberthemilk.com/services/rest/';
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
	aURL += 'api_sig='+hex_md5(toMD5);
//	air.trace('MD5: '+toMD5+', '+aURL);
	return aURL;
}

conn.makeQuery = function(config){
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
        if (req.readyState == 4) {
			if(conn.end)
				conn.end();
            var xml = req.responseXML;
			if(!xml){
				if(config.error)
					config.error(0, 'Can\'t connect to RTM host, please check connection settings');
				return;
			}
			if(xml.getElementsByTagName("err").length>0){
				if(config.error)
					config.error(xml.getElementsByTagName("err").item(0).getAttribute('code'),
								 xml.getElementsByTagName("err").item(0).getAttribute('msg'));
			}else{
				if(config.ok)
					config.ok(xml);
			}
        }
    };
	air.trace('makeQuery to '+config.url);
	if(conn.start)
		conn.start();
    req.open('GET', config.url, true);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(null);
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
			air.trace('frob = '+frob);
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
			air.trace('Token: '+token);
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
					air.trace('adding list: '+nl.item(i).getAttribute('name'));
					conn.lists.push({
						id: nl.item(i).getAttribute('id'),
						name: nl.item(i).getAttribute('name'),
						locked: nl.item(i).getAttribute('locked')!=0,
						smart: nl.item(i).getAttribute('smart')!=0
					});
				}
			}
			if(ok)
				ok(conn.lists);
		}, error: error
	});
}

conn.getLocations = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.locations.getList'),
		ok: function(xml){
			conn.locations = [];
			var nl = xml.getElementsByTagName('location');
			for(var i = 0; i<nl.length; i++){
				air.trace('adding location: '+nl.item(i).getAttribute('name'), nl.item(i).getAttribute('address'));
				conn.locations.push({
					id: nl.item(i).getAttribute('id'),
					name: nl.item(i).getAttribute('name'),
					address: nl.item(i).getAttribute('address')
				});
			}
			if(ok)
				ok(conn.locations);
		}, error: error
	});
}
