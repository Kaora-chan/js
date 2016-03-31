var io = require('socket.io').listen(9898);

var rooms = [];

io.on('connection', function (socket) {
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
				return;
			}
		}
		console.log(3);
		// если в массиве нету свободных комнат, создаем новую
		rooms[rooms.length] = {};
		rooms[rooms.length-1]["white"] = socket;
    });

	// обработчик сообщения об остановке поиска игры
	socket.on('game_stopFinding', function(data){
        console.log(data);
		// находим комнату, где игрок записан белым (если в комнату попал черный, то игра начинвается и соответственно останавливать поиск уже бессмысленно)
		for(var i = 0;i<rooms.length;i++){
			if(rooms[i]["white"].id == socket.id && rooms[i]["black"] == undefined) {
				// находим нужную комнату и затираем содержимое
				rooms[i] = {};
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
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: black, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "black";
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_move', data);
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
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: black, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "black";
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_castling', data);
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
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				//'{playerColor: black, from:' + data.from + ', to:' + data.to + '}'
				data.playerColor = "black";
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('player_promotion', data);
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
				rooms[i] = {};
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "invalid turn", winnerColor:"black"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				rooms[i] = {};
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
				rooms[i] = {};
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "mate", winnerColor:"black"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				rooms[i] = {};
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
				rooms[i] = {};
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "draw", winnerColor:null};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				rooms[i] = {};
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
				rooms[i] = {};
				break;
			}
			else if(rooms[i]["black"] != undefined && rooms[i]["black"].id == socket.id){    // определяем комнату по идентификатору белого игрока
				var msg = {msg: "leave", winnerColor:"white"};
				if(rooms[i]["white"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["white"].emit('game_end', msg);
				if(rooms[i]["black"]!=undefined)    // перед отправкой данных проверяем, что объект существует
					rooms[i]["black"].emit('game_end', msg);
				rooms[i] = {};
				break;
			}
		}
	});

    // обработчик для дебага
	// выводит состояние списка комнат в консоль сервера
	socket.on('get_debug', function(){
		console.log(rooms.length);
		console.log(rooms);
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
