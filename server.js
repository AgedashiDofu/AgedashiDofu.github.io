// ==== 各種モジュール準備 ====
var express = require('express');
var http = require( 'http' );
var socketIO = require('socket.io');
var app = express();		// expressアプリケーション生成
var server = http.Server( app );
var io = socketIO( server );

// 公開フォルダの指定
app.use( express.static( __dirname + '/public' ) );

// サーバーの起動
const PORT_NO = process.env.PORT || 1337;	// ポート番号（環境変数PORTがあればそれを、無ければ1337を使う）
server.listen(
	PORT_NO,	// ポート番号
	() =>
	{
		console.log( 'Starting server on port %d', PORT_NO );
	} );

// socket.ioを設定
io.attach(server);

// ==== 定数 ====
const MAX_USER = 7;					// 最大プレイヤー
const AT_ENTRANCE    = 0;			// プレイヤーの場所：入口
const AT_CARD_MAKING = 1;			// プレイヤーの場所：手札作成
const AT_PLAYING     = 2;			// プレイヤーの場所：ゲーム中
const ID_NO_USE = 0;				// ID未使用
const ID_USED   = 1;				// ID使用済み
const E_ROOM_MAX = 0;				// E-00
const PLAYER_LINE_COLOR = ["red",    "blue",        "yellow",       "green",          "purple",        "greenyellow", "magenta"];
const PLAYER_BACK_COLOR = ["coral", "lightskyblue", "lemonchiffon", "mediumseagreen", "mediumorchid",  "yellowgreen", "plum"   ];

// ==== 変数 ====
var deckCards = new Array();	// 山札
var players   = new Array();	// プレイヤー
var game = {
	turn: 0,									// ターン
	rule: {"handlingCards":5, "fieldCards": 3},	// ルール
};

// ==== 関数 ====
// 接続確立時の処理
io.sockets.on('connection', function(socket) {
	// 接続切断処理
	socket.on('disconnect', function() {
		console.log("disconnect");
		console.log("[before]players: " + players.length);
		for (let i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {	// Socket IDが一致する
				players.splice(i, 1);				// プレイヤーを削除
			}
		}
		console.log("[after] players: " + players.length);
		socket.broadcast.emit('fluctuation_player', players);
	});

	console.log("connect");
	
	// ログイン申請を受信
	socket.on('req_login', function(userName) {
		if (players.length < MAX_USER) {
			var socket_id = socket.id;
			
			var id = issueID();			// IDを発行
			if (id != -1) {
			
				// プレイヤー情報生成
				let player = {
					"id":id,
					"socket_id":socket_id,
					"name":userName,
					"color_line":PLAYER_LINE_COLOR[id],
					"color_back":PLAYER_BACK_COLOR[id],
					"at":AT_CARD_MAKING,
				};
				players.push(player);		// プレイヤー追加
				console.log("players: " + players.length);
				console.log(player);

				socket.join('room');
				
				// 他のプレイヤーへ通知
				socket.broadcast.emit('fluctuation_player', players);
				
				// 手札作成画面表示
				io.to(socket_id).emit('disp_card_making', players, game, deckCards.length);
			}
			else {
				io.to(socket_id).emit('disp_alert_message', E_ROOM_MAX);
			}
		}
		else {
			io.to(socket_id).emit('disp_alert_message', E_ROOM_MAX);
		}
	});
	
	// プレイヤー数確認申請を受信
	socket.on('req_players', function() {
		io.emit('return_players', players.length); 								// 接続プレイヤーへ返信
	});

	// 手札を山札へ追加申請を受信
	socket.on('req_card_to_deck', function(addCard) {
		console.log("add card: " + addCard);
		deckCards.push(addCard);
		io.to('room').emit('update_deck', deckCards.length);					// ルームメンバーへ共有
	});
	
	// ルール変更（手札の数）申請を受信
	socket.on('req_chg_rule_handlings', function(req) {
		game.rule.handlingCards = req;
		io.to('room').emit('update_rule_handlings', game.rule.handlingCards);	// ルームメンバーへ共有
	});
	
	// ルール変更（場の数）申請を受信
	socket.on('req_chg_rule_fields', function(req) {
		game.rule.fieldCards = req;
		io.to('room').emit('update_rule_fields', game.rule.fieldCards);			// ルームメンバーへ共有
	});

	// ゲーム開始申請を受信
	socket.on('req_game_start', function(req) {
		io.to('room').emit('disp_game', players, game, deckCards.length);		// ルームメンバーへ共有
	});
});

// ユーザIDの発行
function issueID()
{
	var serch_id;
	var i;
	var new_id = -1;
	
	for (serch_id = 0; serch_id < MAX_USER; serch_id++) {
		for (i = 0; i < players.length; i++) {
			if (serch_id == players[i].id) {		// serch_idは発行済み
				break;							// 次のserch_idへ
			}
		}

		if (i == players.length) {				// 全プレイヤー確認済み
			new_id = serch_id;					// ID発行
			break;								// 完了
		}
	}
	
	return new_id;
}
