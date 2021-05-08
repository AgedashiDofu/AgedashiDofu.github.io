// ==== 各種モジュール準備 ====
var express = require('express');
var http = require( 'http' );
var socketIO = require('socket.io');
var fs = require('fs');
var iconv = require('iconv-lite');
var readline = require('readline');
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
const MSG_Q_START_GAME  = 0;
const MSG_Q_NEW_THEME   = 1;
const MSG_Q_NEXT_TURN   = 2;
const MSG_COMP_CHG_RULE = 3;
const E_ROOM_MAX       = 0;			// E-00
const E_NO_USERNAME    = 1;			// E-01
const E_BLANK_CARD     = 2;			// E-02
const E_FULL_HANDLINGS = 3;			// E-03
const E_EMPTY_DECK     = 4;			// E-04
const E_CANT_CHG_RULE_HAND  = 5;	// E-05
const E_CANT_CHG_RULE_FIELD = 6;	// E-06
const PLAYER_LINE_COLOR = ["red",    "blue",        "yellow",       "green",          "purple",        "greenyellow", "magenta"];
const PLAYER_BACK_COLOR = ["coral", "lightskyblue", "lemonchiffon", "mediumseagreen", "mediumorchid",  "yellowgreen", "plum"   ];

// ==== 変数 ====
var deckCards = new Array();		// 山札
var fieldCards = [ "", "", "" ];	// 場札
var players   = new Array();		// プレイヤー
var game = {
	turn: 1,									// ターン
	rule: {"handlingCards":5, "fieldCards": 3},	// ルール
	theme: "",									// お題
};
var stage = AT_CARD_MAKING;

// ---- ログ ----
var listLoggingData = new Array();	// ロギングデータのリスト
var dirLogFiles = __dirname + '/log/';
var filepathLogWrite = dirLogFiles + 'log.html';	// ログファイルのパス（＋ファイル名）
var listLog;						// 過去ログ一覧（ファイル名一覧＋日付一覧）

// ==== 関数 ====
// 接続確立時の処理
io.sockets.on('connection', function(socket) {
	console.log("connect");
	listLog = searchLogFile();								// ログファイル一覧取得
	
	// 接続切断処理
	socket.on('disconnect', function() {
		var index;
		var del_player = 0;
		var add_deck = 0;
		
		console.log("disconnect");
		console.log("[before]players: " + players.length);
		for (index = 0; index < players.length; index++) {
			if (players[index].socket_id == socket.id) {	// Socket IDが一致する
				del_player = 1;
				break;
			}
		}
		if (del_player == 1) {								// ログアウトしたプレイヤーあり
			for (let i = 0; i < players[index].handlingCards.length; i++) {
				deckCards.push(players[index].handlingCards[i]);	// 手札を山札に返す
				socket.broadcast.to('room').emit('fluctuation_deck', deckCards.length);	// 山札増を通知
			}
			players.splice(index, 1);						// プレイヤーを削除
			socket.broadcast.emit('fluctuation_player', players);	// プレイヤー減を通知
			console.log("[after] players: " + players.length);
			
			if (players.length == 0) {						// プレイヤー全員がログオフ
				writeLogFile();								// ログファイル（html）作成
				resetGame();								// ゲームをリセット
			}
		}
		else {												// ログインしていないクライアントが接続断
			// 何もしない
		}
	});
	
	// ログイン申請を受信
	socket.on('req_login', function(userName) {
		if (players.length < MAX_USER) {
			var id = issueID();			// IDを発行
			if (id != -1) {
			
				// プレイヤー情報生成
				let player = {
					"id":id,							// ID（カラーリング用）
					"socket_id":socket.id,
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
				
				
				if (stage != AT_PLAYING)  {				// ゲームはまだ開始していないとき
					io.to(socket.id).emit('disp_card_making', players, game, deckCards.length);	// 手札作成画面表示
				}
				else {									// ゲームがすでに始まっているとき
					io.to(socket.id).emit('fluctuation_turn', game.turn);								// 現在のターンを通知
					io.to(socket.id).emit('fluctuation_rule_handlings', game.rule.handlingCards);		// 現在のルール（手札の数）を通知
					io.to(socket.id).emit('fluctuation_rule_fields', game.rule.fieldCards);				// 現在のルール（場の数）を通知
					io.to(socket.id).emit('disp_game', game, deckCards.length, fieldCards, players);	// ゲーム画面表示
				}
			}
			else {
				io.to(socket.id).emit('disp_alert_message', E_ROOM_MAX);
			}
		}
		else {
			io.to(socket.id).emit('disp_alert_message', E_ROOM_MAX);
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
		var index;
		index = searchPlayerIndex(socket.id);								// プレイヤーIndexを検索

		if (game.rule.handlingCards != req) {
			// ルールに変更あり
			if (judgeChageableRuleHandlings(req) == OK) {					// ルール変更（手札の数）申請の可/不可判定
				// ルール変更可
				game.rule.handlingCards = req;
				io.to(players[index].socket_id).emit('disp_message', MSG_COMP_CHG_RULE);	// ルール変更完メッセージ
				io.to('room').emit('fluctuation_rule_handlings', game.rule.handlingCards);	// ルームメンバーへ共有
			}
			else {
				// ルール変更不可
				io.to(players[index].socket_id).emit('disp_alert_message', E_CANT_CHG_RULE_HAND);	// ルール変更できないメッセージ
				io.to(players[index].socket_id).emit('restore_rule_handlings', game.rule.handlingCards);	// 表示を元に戻す指令
			}
		}
		else {
			// ルールに変更なし
		}
	});
	
	// ルール変更（場の数）申請を受信
	socket.on('req_chg_rule_fields', function(req) {
		var index;
		index = searchPlayerIndex(socket.id);								// プレイヤーIndexを検索
		
		if (game.rule.fieldCards != req) {
			// ルールに変更あり
			if (judgeChageableRuleFields(req) == OK) {						// ルール変更（場の数）申請の可/不可判定
				//ルール変更可
				game.rule.fieldCards = req;
				io.to(players[index].socket_id).emit('disp_message', MSG_COMP_CHG_RULE);	// ルール変更完メッセージ
				io.to('room').emit('fluctuation_rule_fields', game.rule.fieldCards);		// ルームメンバーへ共有
			}
			else {
				// ルール変更不可
				io.to(players[index].socket_id).emit('disp_alert_message', E_CANT_CHG_RULE_FIELD);	// ルール変更できないメッセージ
				io.to(players[index].socket_id).emit('restore_rule_fields', game.rule.fieldCards);	// 表示を元に戻す指令
			}
		}
	});

	// ゲーム開始申請を受信
	socket.on('req_game_start', function(req) {
		initGameSystem();																// ゲームシステム初期化
		io.to('room').emit('disp_game', game, deckCards.length, fieldCards, players);	// ルームメンバーへ共有
	});

	// プレイヤー情報を要求を受信
	socket.on('req_player_info', function() {
		var index;
		index = searchPlayerIndex(socket.id);									// プレイヤーIndexを検索
		
		io.to(players[index].socket_id).emit('player_information', game.rule.handlingCards, players[index]);	// 要求元へプレイヤー情報を応答
	});

	// サーバへ手札提出要求
	socket.on('req_card_to_field', function(now_select, selectCard) {
		var index;
		index = searchPlayerIndex(socket.id);									// プレイヤーIndexを検索
		
		if (((game.rule.fieldCards == 2) && (now_select == FIELD_MIDDLE)) ||	// 2枚ルール、かつ中の句のとき
			(fieldCards[now_select] != "")) {									// 場が空でないとき
			// 何もしない
		}
		else {
			fieldCards[now_select] = players[index].handlingCards[selectCard];	// 手札を場へコピー
			players[index].handlingCards.splice(selectCard, 1);					// 選択中の手札を削除
			
			socket.broadcast.to('room').emit('fluctuation_cards', players);				// 他のプレイヤーへ通知
			io.to(players[index].socket_id).emit('success_card_to_field', players);// 要求元へ成功応答
		}
	});
	
	// 場の情報要求を受信
	socket.on('req_fields_information', function() {
		var index;
		index = searchPlayerIndex(socket.id);									// プレイヤーIndexを検索
		
		io.to(players[index].socket_id).emit('fields_information', game.rule.fieldCards, fieldCards);	// 要求元へ場の情報を応答
	});
	
	// 山札からドロー要求を受信
	socket.on('req_draw_from_deck', function() {
		var index;
		index = searchPlayerIndex(socket.id);										// プレイヤーIndexを検索
		
		if (deckCards.length > 0) {
			if (players[index].handlingCards.length < game.rule.handlingCards) {
				players[index].handlingCards.push(deckCards[0]);					// 山札先頭カードを手札に加える
				deckCards.shift();													// 山札先頭カード削除
				
				socket.broadcast.to('room').emit('fluctuation_player', players);			// 他のプレイヤーへ通知
				socket.broadcast.to('room').emit('fluctuation_deck', deckCards.length);		// 他のプレイヤーへ通知
				io.to(players[index].socket_id).emit('success_draw', deckCards.length, players);	// 要求元へ成功応答
			}
			else {
				io.to(players[index].socket_id).emit('disp_alert_message', E_FULL_HANDLINGS);	// 手札いっぱいメッセージ
			}
		}
		else {
			io.to(players[index].socket_id).emit('disp_alert_message', E_EMPTY_DECK);	// 山札がないメッセージ
		}
	});
	
	// お題申請を受信
	socket.on('req_input_theme', function(new_theme) {
		game.theme = new_theme;
		
		io.to('room').emit('fluctuation_theme', new_theme);		// ルームメンバーへ共有
	});

	// 次ターン移行申請を受信
	socket.on('req_next_turn', function() {
		loggingTurnInfo();										// ターン情報をロギング
		removeCardAllFields();									// 場をクリア
		game.turn++;											// ターンをインクリメント
		
		// ルームメンバーへ共有
		io.to('room').emit('fields_information', game.rule.fieldCards, fieldCards);
		io.to('room').emit('fluctuation_turn', game.turn);
	});
	
	// 過去ログ確認申請を受信
	socket.on('req_logs', function() {
		io.to(socket.id).emit('return_logs', listLog);			// 接続プレイヤーへ返信
	});
});

// プレイヤーIndex検索
function searchPlayerIndex(socket_id)
{
	var index;
	for (index = 0; index < players.length; index++) {
		if (players[index].socket_id == socket_id) {
			break;
		}
	}
	
	return index;
}

// プレイヤーIDの発行
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
	genLogFilePath();							// ログファイル名を生成
	shuffleDeckCards();							// 山札をシャッフル
	handOutCards();								// 山札から各プレイヤーへ配る
	stage = AT_PLAYING;							// ゲームステージ
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
		if (players[i].handlingCards.length > req) {		// ルールより多く手札を持っているプレイヤーあり
			return NG;										// ルール変更不可
		}
	}
	
	return OK;												// ルール変更可
}

// ルール変更（場の数）申請の可/不可判定
function judgeChageableRuleFields(req)
{
	if (req == 2) {
		// 場2枚ルールへ変更時
		if (fieldCards[FIELD_MIDDLE] != "") {				// 中の句提出済み
			return NG;										// ルール変更不可
		}
	}
	
	return OK;												// ルール変更可
}

// 場の全カードを削除
function removeCardAllFields()
{
	fieldCards[FIELD_UPPER]  = "";							// 上の句
	fieldCards[FIELD_MIDDLE] = "";							// 中の句
	fieldCards[FIELD_BOTTOM] = "";							// 下の句
}

// ゲームをリセット
function resetGame()
{
	game.turn = 1;											// ターン1へ
	game.theme = "";										// お題クリア
	removeCardAllFields();									// 場をクリア
	deckCards.splice(0);									// 山札クリア
	stage = AT_CARD_MAKING;									// 手札作成ステージ
	listLoggingData.splice(0);								// ロギングデータ削除
}

// ログファイルを検索
function searchLogFile()
{
	var list_log_date = new Array();
	var list_fname = new Array();
	var return_obj = new Object();
	const allDirents = fs.readdirSync(dirLogFiles, { withFileTypes: true });
	
	const list_all_fname = allDirents.filter(dirent => dirent.isFile()).map(({ name }) => name);
	
//	console.log("All file list: " + list_all_fname);
	
	for (let i = 0; i < list_all_fname.length; i++) {
		if ((list_all_fname[i].length == 21) &&				// ファイル名21文字一致確認
			(list_all_fname[i].substr(0, 4) == "log_") && 	// フォーマット一致確認「log_」
			(list_all_fname[i].substr(-5) == ".html")) {	// 拡張子一致確認「.html」
			list_fname.push(dirLogFiles + list_all_fname[i]);
			let date_in_filename = list_all_fname[i].substr(4, (list_all_fname[i].length - 9));	// 日付抜き出し
			let date_with_synbol = strInsSymbol(date_in_filename);		// 日付に"/"や":"を付加
			list_log_date.push(date_with_synbol);
		}
	}
//	console.log("File list: " + list_fname);
//	console.log("Date list: " + list_log_date);
	
	return_obj.file_list = list_fname;						// ログファイルのファイル名のリスト
	return_obj.date_list  = list_log_date;					// ログファイルの日付リスト
	
	return return_obj;
}

// ターン情報をロギング
function loggingTurnInfo()
{
	var playerList = "";
	for (let i = 0; i < players.length; i++) {
		if (i > 0) {
			playerList = playerList + ", ";
		}
		playerList = playerList + players[i].name;
	}
	var loggingData = [
		(game.turn).toString(),
		game.theme,
		fieldCards[FIELD_UPPER],
		fieldCards[FIELD_MIDDLE],
		fieldCards[FIELD_BOTTOM],
		playerList
	];
	listLoggingData.push(loggingData);
}

// ログファイル（html）作成
function writeLogFile()
{
	const css_str = '<link href="log.css" rel="stylesheet" type="text/css">'
	const options = {
		flags: "a",  		// 追加書き込みモード
		encoding: "utf8"	// UTF-8
	};
	const stream = fs.createWriteStream(filepathLogWrite, options);
	stream.write("<html><head>" + css_str + "<title>ログ</title></head><body>\n");
	stream.write("<table><tr><th>ターン</th><th>お題</th><th>上の句</th><th>中の句</th><th>下の句</th><th>メンバー</th></tr>\n");
	for (let i = 0; i < listLoggingData.length; i++) {
		stream.write("<tr>");
		for (let j = 0; j < 6; j++) {
			stream.write("<td>" + listLoggingData[i][j]) + "</td>";
		}
		stream.write("</tr>\n");
	}
	stream.write("</table></body></html>\n");
	stream.end();

	// エラー処理
	stream.on("error", (err)=>{
		if (err) {
			console.log(err.message);
		}
	});
}

// ログファイル名生成
function genLogFilePath()
{
	filepathLogWrite = dirLogFiles + 'log_' + getDateCode() + '.html';
}

// 日時コード取得
function getDateCode()
{
	const date_now = new Date();
	const date_code = (date_now.getFullYear()).toString() + 
						('00' + (date_now.getMonth()+1)).slice(-2) + 
						('00' +  date_now.getDate()).slice(-2) + 
						('00' +  date_now.getHours()).slice(-2) + 
						('00' +  date_now.getMinutes()).slice(-2);
	
	return date_code;
}

// 日付、時間の記号を挿入する
function strInsSymbol(str)
{
	var res = str.substr(0, 4) + '/' + str.substr(4, 2) + '/' + str.substr(6, 2) + '[' + str.substr(8, 2) + ':' + str.substr(10, 2) + ']';
	return res;
};
