app.factory('socketFactory', function(){
	var socketFactory = {};

	socketFactory.isConnected = true;
	socketFactory.isEnigme = false;

	var socket = io('http://10.212.116.203:8080');

	// socketFactory.sendNameTeam = function(name, team) {
	// 	socket.emit('newUser', {'name' : name, 'team' : team});
	// };

	// socketFactory.sendPosition = function(position) {
	// 	socket.emit('sendPosition', position);
	// };

	// socketFactory.sendAnswer = function(answer) {
	// 	socketFactory.isEnigme
	// 	socket.emit('sendAnswer', answer)
	// };

	// socket.on('connexion', function(isConnected) {
	// 	socketFactory.isConnected = isConnected;
	// })

	// socket.on('enigme', function(data) {
	// 	socketFactory.isEnigme = true;
	// 	console.log('enigme : ' + JSON.stringify(data))
	// });

	// socket.on('areas', function(data) {
	// 	console.log('areas : ' + JSON.stringify(data));
	// });

	return socketFactory;
});