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
const OK = 1;
const NG = 0;
const MAX_USER = 7;					// 最大プレイヤー
const AT_ENTRANCE    = 0;			// プレイヤーの場所：入口
const AT_CARD_MAKING = 1;			// プレイヤーの場所：手札作成
const AT_PLAYING     = 2;			// プレイヤーの場所：ゲーム中
const FIELD_UPPER  = 0;				// 上の句
const FIELD_MIDDLE = 1;				// 中の句
const FIELD_BOTTOM = 2;				// 下の句
const ID_NO_USE = 0;				// ID未使用
const ID_USED   = 1;				// ID使用済み
const E_ROOM_MAX       = 0;			// E-00
const E_NO_USERNAME    = 1;			// E-01
const E_BLANK_CARD     = 2;			// E-02
const E_FULL_HANDLINGS = 3;			// E-03
const E_EMPTY_DECK     = 4;			// E-04
const E_CANT_CHG_RULE_HAND = 5;		// E-05
const PLAYER_LINE_COLOR = ["red",    "blue",        "yellow",       "green",          "purple",        "greenyellow", "magenta"];
const PLAYER_BACK_COLOR = ["coral", "lightskyblue", "lemonchiffon", "mediumseagreen", "mediumorchid",  "yellowgreen", "plum"   ];

// ==== 変数 ====
var deckCards = new Array();		// 山札
var fieldCards = [ "", "", "" ];	// 場札
var players   = new Array();		// プレイヤー
var game = {
	turn: 1,									// ターン
	rule: {"handlingCards":5, "fieldCards": 3},	// ルール
	theme: ""
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
				players.splice(i, 1);					// プレイヤーを削除
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
					"id":id,							// ID（カラーリング用）
					"socket_id":socket_id,
					"name":userName,					// 名前
					"color_line":PLAYER_LINE_COLOR[id],	// 枠の色
					"color_back":PLAYER_BACK_COLOR[id],	// リストの色
					"at":AT_CARD_MAKING,				// プレイヤーの位置
				};
				player.handlingCards = new Array();		// 手札
				players.push(player);					// プレイヤー追加
				console.log("players: " + players.length);
				console.log(player);

				socket.join('room');
				
				socket.broadcast.emit('fluctuation_player', players);	// 他のプレイヤーへ通知
				
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
		io.to('room').emit('fluctuation_deck', deckCards.length);					// ルームメンバーへ共有
	});
	
	// ルール変更（手札の数）申請を受信
	socket.on('req_chg_rule_handlings', function(req) {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		if (game.rule.handlingCards != req) {
			// ルールに変更あり
			if (judgeChageableRuleHandlings(req) == OK) {				// ルール変更（手札の数）申請の可/不可判定
				// ルール変更可
				game.rule.handlingCards = req;
				io.to('room').emit('fluctuation_rule_handlings', game.rule.handlingCards);	// ルームメンバーへ共有
			}
			else {
				// ルール変更不可
				io.to(players[i].socket_id).emit('disp_alert_message', E_CANT_CHG_RULE_HAND);	// ルール変更できないメッセージ
				io.to(players[i].socket_id).emit('restore_rule_handlings', game.rule.handlingCards);	// 表示を元に戻す指令
			}
		}
		else {
			// ルールに変更なし
		}
	});
	
	// ルール変更（場の数）申請を受信
	socket.on('req_chg_rule_fields', function(req) {
		if (game.rule.fieldCards != req) {
			game.rule.fieldCards = req;
			io.to('room').emit('fluctuation_rule_fields', game.rule.fieldCards);			// ルームメンバーへ共有
		}
	});

	// ゲーム開始申請を受信
	socket.on('req_game_start', function(req) {
		initGameSystem();														// ゲームシステム初期化
		io.to('room').emit('disp_game', game, deckCards.length, players);		// ルームメンバーへ共有
	});

	// プレイヤー情報を要求を受信
	socket.on('req_player_info', function() {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		io.to(players[i].socket_id).emit('player_information', game.rule.handlingCards, players[i]);		// 要求元へプレイヤー情報を応答
	});

	// サーバへ手札提出要求
	socket.on('req_card_to_field', function(now_select, selectCard) {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		if ((game.rule.handlingCards == 2) && (now_select == FIELD_MIDDLE) ||	// 2枚ルール、かつ中の句のとき
			(fieldCards[now_select] != "")) {									// 場が空でないとき
			// 何もしない
			console.log("req_card_to_field : fail");
		}
		else {
			console.log("req_card_to_field : success");
			fieldCards[now_select] = players[i].handlingCards[selectCard];		// 手札を場へコピー
			players[i].handlingCards.splice(selectCard, 1);						// 選択中の手札を削除
			
			socket.broadcast.emit('fluctuation_cards', players, fieldCards);	// 他のプレイヤーへ通知
			io.to(players[i].socket_id).emit('success_card_to_field', players);	// 要求元へ成功応答
		}
	});
	
	// 場の情報要求を受信
	socket.on('req_fields_information', function() {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		io.to(players[i].socket_id).emit('fields_information', game.rule.fieldCards, fieldCards);	// 要求元へ場の情報を応答
	});
	
	// 山札からドロー要求を受信
	socket.on('req_draw_from_deck', function() {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		
		if (deckCards.length > 0) {
			if (players[i].handlingCards.length < game.rule.handlingCards) {
				players[i].handlingCards.push(deckCards[0]);						// 山札先頭カードを手札に加える
				deckCards.shift();													// 山札先頭カード削除
				
				socket.broadcast.emit('fluctuation_player', players);				// 他のプレイヤーへ通知
				socket.broadcast.emit('fluctuation_deck', deckCards.length);		// 他のプレイヤーへ通知
				io.to(players[i].socket_id).emit('success_draw', deckCards.length, players);	// 要求元へ成功応答
			}
			else {
				io.to(players[i].socket_id).emit('disp_alert_message', E_FULL_HANDLINGS);		// 手札いっぱいメッセージ
			}
		}
		else {
			io.to(players[i].socket_id).emit('disp_alert_message', E_EMPTY_DECK);				// 山札がないメッセージ
		}
	});
	
	// お題申請を受信
	socket.on('req_input_theme', function(new_theme) {
		game.theme = new_theme;
		
		io.to('room').emit('fluctuation_theme', new_theme);		// ルームメンバーへ共有
	});

	// 次ターン移行申請を受信
	socket.on('req_next_turn', function() {
		fieldCards[FIELD_UPPER]  = "";							// 上の句
		fieldCards[FIELD_MIDDLE] = "";							// 中の句
		fieldCards[FIELD_BOTTOM] = "";							// 下の句
		game.turn++;											// ターンをインクリメント
		
		// ルームメンバーへ共有
		io.to('room').emit('fields_information', game.rule.fieldCards, fieldCards);
		io.to('room').emit('fluctuation_turn', game.turn);
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
			if (serch_id == players[i].id) {	// serch_idは発行済み
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

// ゲームシステム初期化
function initGameSystem()
{
	shuffleDeckCards();							// 山札をシャッフル
	handOutCards();								// 山札から各プレイヤーへ配る
}

// 山札をシャッフル
function shuffleDeckCards()
{
	for (let i = deckCards.length; 1 < i; i--) {
		let k = Math.floor(Math.random() * i);
		[deckCards[k], deckCards[i - 1]] = [deckCards[i - 1], deckCards[k]];
	}
}

// 山札から各プレイヤーへ札を配る
function handOutCards()
{
	for (let i = 0; i < players.length; i++) {
		for (let j = 0; j < game.rule.handlingCards; j++) {
			players[i].handlingCards.push(deckCards[0]);	// 山札の先頭のカードを追加
			deckCards.shift();								// 先頭カードを削除
		}
	}
}

// ルール変更（手札の数）申請の可/不可判定
function judgeChageableRuleHandlings(req)
{
	for (let i = 0; i < players.length; i++) {
		if (players[i].handlingCards.length > req) {
			console.log("NG [" + i + "] " + players[i].handlingCards.length + ", req: " + req);
			return NG;
		}
	}
	
	console.log("OK");
	return OK;
}
