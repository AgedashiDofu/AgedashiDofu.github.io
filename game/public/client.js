//############################
// Kami To Pen Online
// Client Program Ver.0.0.1
//############################

// ==== 定数 ====
const MAX_USER = 7;					// 最大プレイヤー（server.jsと共通）

// ---- プレイヤーのステージ ----
const AT_ENTRANCE    = 0;
const AT_CARD_MAKING = 1;
const AT_PLAYING     = 2;

// ---- 通常メッセージ ----（server.jsと共通）
const MSG_Q_START_GAME  = 0;
const MSG_Q_NEW_THEME   = 1;
const MSG_Q_NEXT_TURN   = 2;
const MSG_COMP_CHG_RULE = 3;
const NORM_MSG = [
	"ゲームを開始する？",						// MSG_Q_START_GAME
	"新しいお題を出す？",						// MSG_Q_NEW_THEME
	"場のカードを流して、次のターンへ？",		// MSG_Q_NEXT_TURN
	"ルール変更完了！",							// MSG_COMP_CHG_RULE
];

// ---- エラーメッセージ ----（server.jsと共通）
const E_ROOM_MAX            = 0;	// E-00
const E_NO_USERNAME         = 1;	// E-01
const E_BLANK_CARD          = 2;	// E-02
const E_FULL_HANDLINGS      = 3;	// E-03
const E_EMPTY_DECK          = 4;	// E-04
const E_CANT_CHG_RULE_HAND  = 5;	// E-05
const E_CANT_CHG_RULE_FIELD = 6;	// E-06
const ERR_MSG = [
	"[E-00] ルームがいっぱいで、入れへんわ。すまんの。",			// E_ROOM_MAX
	"[E-01] 名前を入力してから入ってな。",							// E_NO_USERNAME
	"[E-02] あれ？白紙やん。何か書いてから山札に置こか。",			// E_BLANK_CARD
	"[E-03] 手札がいっぱいで、手札ドローできへんわ。",				// E_FULL_HANDLINGS
	"[E-04] あ、山札がもうないわ。",								// E_EMPTY_DECK
	"[E-05] 手札の数が多い人がいるから、ルール変更できへんわ。",	// E_CANT_CHG_RULE_HAND
	"[E-06] 中の句がすでに出てるから、ルール変更できへんわ。",		// E_CANT_CHG_RULE_FIELD
];

// ==== 変数 ====
var socket = io();

// ---- 自プレイヤー情報 ----
var myStage = AT_ENTRANCE;				// ステージ
var myHandlingCards = 0;				// 手札の数


// ==== 関数 ====
// ---- 0.共通 ----
// 画面ロード時
window.onload = function(){	
	preloadImage();			// 画像ファイルプリロード
	cancelSelCard();		// 手札選択状態の初期化
	checkPlayers();			// ルーム内プレイヤー数の確認
	checkLog();				// 過去ログの確認
	
	myStage = AT_ENTRANCE;
	myHandlingCards = 0;
}

// サーバから通常メッセージ表示指令を受信
socket.on('disp_message', function(msg)
{
	alert(NORM_MSG[msg]);
});

// サーバからエラーメッセージ表示指令を受信
socket.on('disp_alert_message', function(msg)
{
	alert(ERR_MSG[msg]);
});

// サーバからプレイヤー情報変化の通知を受信
socket.on('fluctuation_player', function(players)
{
	if (myStage == AT_CARD_MAKING ||
		myStage == AT_PLAYING) {
		genPlayersTable(players);					// プレイヤーリスト更新
	}
	if (myStage == AT_ENTRANCE) {
		checkPlayers();
	}
});

// クライアントがルール変更（手札の数）ボタン押下
function btnChangeRuleHandlings()
{
	let req = getFormSelHandCards();
	socket.emit('req_chg_rule_handlings', req);		// サーバへルール変更（手札の数）申請
}

// クライアントがルール変更（場の数）ボタン押下
function btnChangeRuleFields()
{
	let req = getFormSelFieldCards();
	socket.emit('req_chg_rule_fields', req);		// サーバへルール変更（場の数）申請
}

// サーバからルール（手札の数）の表示更新指令を受信
socket.on('fluctuation_rule_handlings', function(new_value)
{
	document.getElementById("selectHandleCards").value = new_value;
	
	if (myStage == AT_PLAYING) {
		updateHandlingCards();						// 手札再描画
	}
});

// サーバからルール（手札の数）の表示を元に戻す指令を受信
socket.on('restore_rule_handlings', function(now_value)
{
	document.getElementById("selectHandleCards").value = now_value;
});

// サーバからルール（場の数）の表示更新指令を受信
socket.on('fluctuation_rule_fields', function(new_value)
{
	document.getElementById("selectFields").value = new_value;

	if (myStage == AT_PLAYING) {
		changeRulesFields(new_value);				// ルール変更処理
		clearFields();								// 場クリア
		updateFields();								// 場再描画
	}
});

// サーバからルール（場の数）の表示を元に戻す指令を受信
socket.on('restore_rule_fields', function(now_value)
{
	document.getElementById("selectFields").value = now_value;
});

// ---- 3.ゲーム中 ----
// サーバからゲーム画面表示指令を受信
socket.on('disp_game', function(game, num_of_deck, fieldCards, players)
{
	if (myStage == AT_CARD_MAKING) {
		document.getElementById('viewCardMaking').style.display = 'none';
	}
	else  {
		document.getElementById('viewEntrance').style.display = 'none';
		document.getElementById('viewCaution').style.display = 'none';
		document.getElementById('viewListLog').style.display = 'none';
		document.getElementById('viewPlayersTable').style.display = 'block';
		document.getElementById('viewRuleSetting').style.display = 'block';
		
		// タイトルを小さくする
		reduceTitle();
	}
	document.getElementById('viewTurn').style.display = 'block';
	document.getElementById('viewInputTheme').style.display = 'block';
	document.getElementById('viewGame').style.display = 'block';
	myStage = AT_PLAYING;
	
	// ゲーム初期画面描画
	drawGameInit(game.theme,
				 fieldCards,
				 game.rule.handlingCards, 
				 game.rule.fieldCards,
				 num_of_deck);

	genPlayersTable(players);			// プレイヤーリスト更新
	
	updateHandlingCards();				// 手札再描画
});

// 手札再描画
function updateHandlingCards()
{
	socket.emit('req_player_info');		// サーバへプレイヤー情報要求
}

// サーバからプレイヤー情報を受信
socket.on('player_information', function(ruleHandlingCards, player)
{
	myHandlingCards = player.handlingCards.length;
	
	drawAllHandlingCards(player.handlingCards, ruleHandlingCards);	// 全手札の描画
});

// 手札提出要求
function reqCardToField(now_select, selectCard)
{
	socket.emit('req_card_to_field', now_select, selectCard);		// サーバへ手札提出要求
}

// サーバから手札提出要求成功を受信
socket.on('success_card_to_field', function(players)
{
	genPlayersTable(players);			// プレイヤーリスト更新
	cancelSelCard();					// 手札選択解除
	updateHandlingCards();				// 手札再描画
	updateFields();						// 場再描画
});

// 場再描画
function updateFields()
{
	socket.emit('req_fields_information');		// サーバへ場の情報要求
}

// サーバから場の情報を受信
socket.on('fields_information', function(ruleFieldCards, fieldCards)
{
	drawAllFields(fieldCards, ruleFieldCards);	// 全場の描画
});

// 手札数と、場のカード変更通知を受信
socket.on('fluctuation_cards', function(players)
{
	genPlayersTable(players);			// プレイヤーリスト更新
	updateFields();						// 場再描画
});

// 山札からドロー要求
function reqDrawFromDeck()
{
	socket.emit('req_draw_from_deck');		// サーバへ山札からドロー要求
}

// ドロー要求成功を受信
socket.on('success_draw', function(num_of_deck, players)
{
	updateHandlingCards();					// 手札更新
	updateNumOfDeck(num_of_deck);			// 山札枚数更新
	genPlayersTable(players);				// プレイヤーリスト更新
});

// クライアントがお題入力ボタン押下
function btnInputTheme()
{
	var res = confirm(NORM_MSG[MSG_Q_NEW_THEME]);	// 新しいお題を出すか？メッセージ
	if (res == true) {
		// OK
		let elem = document.getElementById('inputTheme');
		socket.emit('req_input_theme', elem.value);	// サーバへお題申請
		elem.value = '';							// お題をクリア
	}
	else {
		// NG
	}
}

// サーバからお題変更を受信
socket.on('fluctuation_theme', function(new_theme)
{
	updateTheme(new_theme);							// お題を描画
});

// クライアントが次のターンへボタン押下
function btnNextTurn()
{
	var res = confirm(NORM_MSG[MSG_Q_NEXT_TURN]);	// 次のターンへ？メッセージ
	if (res == true) {
		// OK
		socket.emit('req_next_turn');				// サーバへ次ターン移行申請
	}
	else {
		// NG
	}
}

// サーバからターン変更を受信
socket.on('fluctuation_turn', function(next_turn)
{
	document.getElementById('textTurn').innerHTML = next_turn;
});

// ---- 2.手札作成中 ----
// クライアントが手札を山札へ追加ボタン押下
function btnCardToDeck()
{
	let elem = document.getElementById('inputCard')
	
	if (elem.value != "") {
		socket.emit('req_card_to_deck', elem.value);	// サーバへ手札を山札へ追加申請
		document.getElementById('inputCard').value = '';
	}
	else {
		// 空の手札を山札へ追加しようとした
		alert(ERR_MSG[E_BLANK_CARD]);
	}
}

// サーバから山札の枚数変更通知を受信
socket.on('fluctuation_deck', function(num_of_deck)
{
	if (myStage == AT_PLAYING) {
		updateNumOfDeck(num_of_deck);				// 山札枚数更新
	}
	else {
		let elem = document.getElementById('textCardsOfDeck');
		elem.innerHTML = num_of_deck;
	}
});

// クライアントがゲーム開始ボタン押下
function btnGameStart()
{
	var decks = document.getElementById('textCardsOfDeck').innerHTML;
	var handling_cards = getFormSelHandCards();
	var players = document.getElementById('textRoomPlayers').innerHTML;
	
	var res = confirm(NORM_MSG[MSG_Q_START_GAME]);	// ゲームを開始する？メッセージ
	if (res == true) {
		// OK
		if (decks >= (handling_cards * players)) {
			socket.emit('req_game_start');		// サーバへゲーム開始申請
		}
		else {
			alert(players + "人で、" + handling_cards + "枚ずつ配るし、山札が多分足りひんで。もうちょい山札増やそか");
		}
	}
	else {
		// Cancel
    }
}


// ---- 1.入口 ----
// クライアントがログインボタン押下
function btnLogin()
{
	if (document.getElementById('textRoomPlayers').innerHTML < MAX_USER)
	{
		// ログイン数制限内
		let elem = document.getElementById("inputPlayerName");
		if (elem.value != "") {
			// プレイヤー名入力あり
			document.getElementById("idBtnLogin").disabled = true;	// ログインボタン無効化（2度押し回避）
			socket.emit('req_login', elem.value);		// サーバへログイン申請
		}
		else {
			// プレイヤー名入力なし
			alert(ERR_MSG[E_NO_USERNAME]);
		}
	}
	else {
		// ログイン数制限オーバー
		alert(ERR_MSG[E_ROOM_MAX]);
	}
}

// サーバから手札作成画面表示指令を受信
socket.on('disp_card_making', function(players, game, num_of_deck)
{
	if (myStage == AT_ENTRANCE) {
		myStage = AT_CARD_MAKING;
		
		// 画面表示
		document.getElementById('viewEntrance').style.display = 'none';
		document.getElementById('viewCaution').style.display = 'none';
		document.getElementById('viewListLog').style.display = 'none';
		document.getElementById('viewPlayersTable').style.display = 'block';
		document.getElementById('viewCardMaking').style.display = 'block';
		document.getElementById('viewRuleSetting').style.display = 'block';
		
		// タイトルを小さくする
		reduceTitle();
		
		// フォーム表示
		genPlayersTable(players);					// プレイヤーリスト更新
		document.getElementById("selectHandleCards").value = game.rule.handlingCards;
		document.getElementById("selectFields").value = game.rule.fieldCards;
		document.getElementById('textTurn').innerHTML = game.turn;
		document.getElementById('textCardsOfDeck').innerHTML = num_of_deck;
	}
});

// サーバからプレイヤー数確認申請の応答を受信
socket.on('return_players', function(num_of_players)
{
	// ルーム内プレイヤー数更新
	let elem = document.getElementById('textRoomPlayers');
	elem.innerHTML = num_of_players;

	if (myStage == AT_ENTRANCE) {
		// ログインボタン有効化（サーバーから必要な情報を得たため）
		if (document.getElementById("idBtnLogin").disabled == true) {
			document.getElementById("idBtnLogin").disabled = false;
		}
	}
});

// ---- サブ関数 ----
// [サブ関数]プレイヤーテーブル作成
function genPlayersTable(players)
{
	var elem = document.getElementById('tablePlayers');
	let elem_old = document.getElementById('tablePlayersData');
	if (elem_old != null) {
		elem.removeChild(elem_old);
	}
	var tbl = document.createElement("table");
	tbl.setAttribute("id", 'tablePlayersData');
	var tblBody = document.createElement("tbody");
	var row = document.createElement("tr");
	var cell = document.createElement("td");
	var cellText = document.createTextNode("ルームメンバー");
	cell.setAttribute("bgcolor", "white");
	cell.setAttribute("colspan", "2");
	cell.appendChild(cellText);
	row.appendChild(cell);
	tblBody.appendChild(row);
	tbl.appendChild(tblBody);

	tblBody = document.createElement("tbody");
	for (var i = 0; i < players.length; i++) {
		row = document.createElement("tr");
		
		for (var j = 0; j < 2; j++) {
			cell = document.createElement("td");
			if (j == 0) {
				cellText = document.createTextNode(players[i].name);
				cell.setAttribute("bgcolor", players[i].color_back);
			}
			else {
				if (myStage == AT_PLAYING) {
					cellText = document.createTextNode(players[i].handlingCards.length + "枚");
				}
				else {
					cellText = document.createTextNode("0枚");
				}
			}
			cell.appendChild(cellText);
			row.appendChild(cell);
		}
		tblBody.appendChild(row);
	}

	tbl.appendChild(tblBody);
	elem.appendChild(tbl);
	tbl.setAttribute("style", "border: double 8px black");
	tbl.setAttribute("rules", "groups");
	tbl.setAttribute("cellpadding", "4");
	

	// ルーム内プレイヤー数更新
	elem = document.getElementById('textRoomPlayers');
	elem.innerHTML = players.length;
}

// [サブ関数] タイトルを小さくする
function reduceTitle()
{
	document.getElementById('idTitleImg').width  = '200';
	document.getElementById('idTitleImg').height = '35';
}

// [サブ関数] プレイヤー数確認
function checkPlayers()
{
	if (myStage == AT_ENTRANCE) {
		socket.emit('req_players');	// サーバへプレイヤー数確認申請
	}
}

// [サブ関数] フォームのルール（手札の数）を取得
function getFormSelHandCards()
{
	return document.getElementById("selectHandleCards").value;
}

// [サブ関数] フォームのルール（場の札数）を取得
function getFormSelFieldCards()
{
	return document.getElementById("selectFields").value;
}

// [サブ関数] 自分の手札の枚数を取得
function getMyHandCards()
{
	return myHandlingCards;
}

// [サブ関数]過去ログテーブル作成
function genLogTable(list_log)
{
	var elem = document.getElementById('tableLog');
	let elem_old = document.getElementById('tableLogData');
	if (elem_old != null) {
		elem.removeChild(elem_old);
	}
	var tbl = document.createElement("table");
	tbl.setAttribute("id", 'tableLogData');
	
	if (list_log.file_list.length != 0) {
		for (let i = 0; i < list_log.file_list.length; i++) {
			row = document.createElement("tr");
			cell = document.createElement("td");
			let elem_a = document.createElement("a");
			cellText = document.createTextNode(list_log.date_list[i]);
			elem_a.appendChild(cellText);
			elem_a.setAttribute("href", list_log.file_list[i]);
			elem_a.setAttribute("target", "_blank");
			cell.appendChild(elem_a);
			cell.setAttribute("bgcolor", "white");
			row.appendChild(cell);
			tbl.appendChild(row);
		}
	}
	else {
		row = document.createElement("tr");
		cell = document.createElement("td");
		cellText = document.createTextNode("記録なし");
		cell.setAttribute("bgcolor", "white");
		cell.appendChild(cellText);
		row.appendChild(cell);
		tbl.appendChild(row);
	}

	tbl.setAttribute("rules", "none");
	tbl.setAttribute("cellpadding", "4");
	tbl.setAttribute("border", "2");
	tbl.setAttribute("bordercolor", "black");
	tbl.setAttribute("style", "display: block; width: 300px; height: 180px; overflow-y: scroll; border-collapse: collapse; border-style: solid;");
	elem.appendChild(tbl);
}

// [サブ関数]過去ログの確認
function checkLog()
{
	if (myStage == AT_ENTRANCE) {
		socket.emit('req_logs');			// サーバへ過去ログ確認申請
	}
}

// [サブ関数]サーバから過去ログ確認申請の応答を受信
socket.on('return_logs', function(list_log)
{
	genLogTable(list_log);					// 過去ログテーブル生成
});
