var defaultState = {
		mainWidth: 300,
		mainHeight: 500,
		mainTop: 100,
		mainLeft: 100,
		authToken: ''
	};
var settings = new Ext.air.FileProvider({
	file: 'rtmdesktop.options',
	defaultState: defaultState
});
