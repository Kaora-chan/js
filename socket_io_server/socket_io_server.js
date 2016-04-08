var io = require('socket.io').listen(9898);

var rooms = [];
var roomsSubscribers = [];

// функция для отправки сообщений смотрящим игру
// все сообщения, которые отправляются сервером второму игроку будут пересылаться также и всем смотрящим эту игру
function sendNotificationsToRoomSpectrators(roomID, type, data){
	console.log(roomID);
	var r = undefined;
	// ищем комнату
	for(var i = 0;i<rooms.length;i++){
		if(rooms[i] != undefined && rooms[i]['white']!=undefined && rooms[i]['white'].id == roomID){
			r = rooms[i];
			break;
		}
	}
	// если комната не найдена, то выходим
	if(r == undefined){
		return;
	}
	// сохраняем историю
	r["history"].push({type:type,data:data});

	// уведомляем подписчиков
	for(var i=0;i<r["spectrators"].length;i++){
		if(r["spectrators"][i] != undefined)
			r["spectrators"][i].emit(type, data);
	};
};

// функция для отправки списка комнат следящим за играми
function sendRoomsListToRoomsSubscribers(){
	var lst = [];
	var count = 0;

	// составляем список комнат, в которых сейчас играют
	for(var i = 0;i<rooms.length;i++){
		if(rooms[i] != undefined && rooms[i]["white"] != undefined){
			var t = {roomID:rooms[i]["white"].id, length: (rooms[i]["spectrators"].length+ (rooms[i]["black"] == undefined ? 1 : 2))};
			lst[count++] = t;
		}
	};

	/// console logs for debug
	console.log('first cycle finished');
	console.log(lst.length);
	console.log(lst);
	console.log(roomsSubscribers.length);
	///

	// высылаем текущий список комнат следящим за ним
	for(var i=0;i<roomsSubscribers.length;i++){
		if(roomsSubscribers[i] != undefined){
			console.log('sending message to: ' + roomsSubscribers[i].id);
			roomsSubscribers[i].emit('roomsList', lst);
		}
	};
};

io.on('connection', function (socket) {
	// обработчик запроса на получение списка комнат
	socket.on('roomsList_Subscribe', function(data){
		console.log(data);
		var inserted = false;
		// вставляем подписчика в список следящих
		for(var i = 0;i<roomsSubscribers.length;i++){
			if(roomsSubscribers[i] == undefined){
				roomsSubscribers[i] = socket;
				inserted = true;
			}
		}
		if(!inserted){
			// если в списке нету пробелов, то добавляем в конец списка
			roomsSubscribers[roomsSubscribers.length] = socket;
		}

		// высылаем список комнат всем следящим
		sendRoomsListToRoomsSubscribers();
	});

	// обработчик запроса на отмену подписки на изменение списка комнат
	socket.on('roomsList_unsubscribe', function(data){
		console.log(data);
		// удаляем следящего из списка
		for(var i = 0;i<roomsSubscribers.length;i++){
			if(roomsSubscribers[i] != undefined && roomsSubscribers[i].id == socket.id){
				roomsSubscribers[i] = undefined;
				break;
			}
		}
	});

	// обработчик запроса на вход в комнату
	socket.on('room_enter', function(data){
		console.log(data);
		for(var i = 0;i<rooms.length;i++){
			// ищем комнату
			if(rooms[i] != undefined && rooms[i]['white'].id == data.roomID){
				// console log for debug
				console.log(socket.id + ' entered room: ' + data.roomID);
				// добавляем следящего в список смотрящих в данной комнате
				rooms[i]["spectrators"].push(socket);

				// высылаем всю историю ходов на текущий момент новому смотрящему для актуализации состояния доски
				for(var j=0;j<rooms[i]["history"].length;j++){
					socket.emit(rooms[i]["history"][j].type, rooms[i]["history"][j].data);
				}
				return;
			}
		}
	});

	// обработчик запроса на поиск игры
    socket.on('game_find', function(data){
        console.log(data);
		// проверяем каждую комнату в нашем массиве
		for(var i = 0;i<rooms.length;i++){
			/*if(rooms[i]["white"] == undefined){
				rooms[i]["white"] = socket;
				black = false;
			}
			else */

			// если в комнате нету белого игрка, то записываемся белым
			// в качестве записи оставляем объект сокета, принадлежащий текущему клиенту
			if(rooms[i]["white"] == undefined){
				console.log(1);
				rooms[i]["white"] = socket;
				return;
			} // если в комнате есть белый но нету черного записываемся черным и рассылаем сообщения о начале игры
			else if(rooms[i]["black"] == undefined){
				console.log(2);
				rooms[i]["black"] = socket;

				if(rooms[i]["black"] != undefined)
					rooms[i]["black"].emit('game_found',{color : "black", roomID: rooms[i]["white"].id});
				if(rooms[i]["white"] != undefined)
					rooms[i]["white"].emit('game_found',{color : "white", roomID: rooms[i]["white"].id});
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_found', null);
				return;
			}
		}
		console.log(3);
		// если в массиве нету свободных комнат, создаем новую
		rooms[rooms.length] = {};
		rooms[rooms.length-1]["spectrators"] = [];		// этот список хранит смотрящих за данной конкретной комнатой
		rooms[rooms.length-1]["history"] = [];
		rooms[rooms.length-1]["white"] = socket;
		sendRoomsListToRoomsSubscribers();
    });

	// обработчик сообщения об остановке поиска игры
	socket.on('game_stopFinding', function(data){
        console.log(data);
		// находим комнату, где игрок записан белым (если в комнату попал черный, то игра начинвается и соответственно останавливать поиск уже бессмысленно)
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"].id == socket.id && rooms[i]["black"] == undefined) {
				// находим нужную комнату и затираем содержимое
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}
		}
    });

	// обработчик сообщения о передвижении игрока
	socket.on('turn_move', function(data){
        console.log(data);
		// ищем нужную комнату и отправляем сопернику данные о сделанном ходе
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: white, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "white";
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('player_move', data );
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'player_move', data);
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: black, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "black";
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_move', data);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'player_move', data);
				break;
			}
		}
    });

	// обработчик сообщения о проведенной рокировке
	socket.on('turn_castling', function(data){
        console.log(data);
		// ищем нужную комнату и отправляем сопернику данные о сделанном ходе
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: white, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "white";
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('player_castling', data);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'player_castling', data);
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: black, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "black";
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_castling', data);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'player_castling', data);
				break;
			}
		}
    });

	// обработчик сообщения о проведенном проведении пешки
	socket.on('turn_promotion', function(data){
        console.log(data);
		// ищем нужную комнату и отправляем сопернику данные о сделанном ходе
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: white, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "white";
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('player_promotion', data);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'player_promotion', data);
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: black, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "black";
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_promotion', data);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'player_promotion', data);
				break;
			}
		}
    });

	// обработчик сообщения о МАТе
	socket.on('turn_mate', function(data){
        console.log(data);
		// ищем нужную комнату и передаем сопернику информацию о том, что его оппоненту был поставлен МАТ
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('player_mate');
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_mate');
				break;
			}
		}

    });

	// обработчик сообщения о ПАТе (в текущей версии протокола ничья)
	socket.on('turn_draw', function(data){
        console.log(data);
		// ищем нужную комнату и передаем сопернику информацию о том, что его оппоненту был поставлен ПАТ
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('player_draw');
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_draw');
				break;
			}
		}
    });

	// обработчик сообщения о некорректном ходе/действии
	// игра завершается и игрок, выполнивший некорректное действие автоматически считается проигравшим
	socket.on('turnValidation_invalid', function(data){
        console.log(data);
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "invalid turn", winnerColor:"white"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "invalid turn", winnerColor:"black"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}

		}
    });

	// обработчик сообщения-подтверждения МАТа
	// игра завершается
	socket.on('turnValidation_mate', function(data){
        console.log(data);
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "mate", winnerColor:"white"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "mate", winnerColor:"black"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}

		}
    });

	// обработчик сообщения-подтверждения ПАТа
	// игра завершается
	socket.on('turnValidation_draw', function(data){
        console.log(data);
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "draw", winnerColor:null};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "draw", winnerColor:null};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}

		}
    });


	// обработчик события отключения клиента
	// например, вкладку в браузере закрыли/перезагрузили
	// игра завершается и отключившийся игрок автоматически считается проигравшим
	socket.on('disconnect', function() {
		console.log('disconnected: ' + socket.id);
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"] != undefined && rooms[i]["white"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "leave", winnerColor:"black"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "leave", winnerColor:"white"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				sendNotificationsToRoomSpectrators(rooms[i]["white"].id, 'game_end', msg);
				rooms[i] = {}; rooms[i]["spectrators"]=[]; rooms[i]["history"]=[];
				break;
			}
		}
	});



    // обработчик для дебага
	// выводит состояние списка комнат в консоль сервера
	socket.on('get_debug', function(){
		console.log('debug info:');
		console.log(rooms.length);
		console.log(rooms);
		console.log(roomsSubscribers);
	});
    socket.on('info_port', function(data) {
        if (data === 'clients') {
            console.log('all_clients:');
            console.log(io.sockets.sockets);
        }
        if (data === 'rooms') {
            console.log('all rooms:');
            console.log(io.sockets.manager.rooms);
        }
        if (data === 'room_clients') {
            console.log('room clients:');
            console.log(io.sockets.clients('room1'));
        }
    });
});
