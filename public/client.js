const MAX_USER       = 7;			// 最大プレイヤー
const AT_ENTRANCE    = 0;
const AT_CARD_MAKING = 1;
const AT_PLAYING     = 2;
const E_ROOM_MAX     = 0;			// E-00
const E_NO_USERNAME  = 1;			// E-01
const E_BLANK_CARD   = 2;			// E-02
const ERR_MSG = [
	"[E-00] ルームがいっぱいで、入れへんわ。すまんの。",	// E_ROOM_MAX
	"[E-01] 名前を入力してから入ってな。",					// E_NO_USERNAME
	"[E-02] あれ？白紙やん。何か書いてから山札に置こか。"	// E_BLANK_CARD
];
var socket = io('http://localhost:1337');
var myPlace = AT_ENTRANCE;

// ==== 0.共通 ====
checkPlayers();

// サーバからプレイヤー数変化の通知を受信
socket.on('fluctuation_player', function(players)
{
	if (myPlace == AT_CARD_MAKING) {
		generatTable(players);
	}
	if (myPlace == AT_ENTRANCE) {
		checkPlayers();
	}
});

// クライアントがルール変更（手札の数）ボタン押下
function btnChangeRuleHandlings()
{
	var req = document.getElementById("selectHandleCards").value;
	socket.emit('req_chg_rule_handlings', req);		// サーバへルール変更（手札の数）申請
}

// クライアントがルール変更（場の数）ボタン押下
function btnChangeRuleFields()
{
	var req = document.getElementById("selectFields").value;
	socket.emit('req_chg_rule_fields', req);		// サーバへルール変更（場の数）申請
}

// サーバからルール（手札の数）の表示更新指令を受信
socket.on('update_rule_handlings', function(new_value)
{
	document.getElementById("selectHandleCards").value = new_value;
});

// サーバからルール（場の数）の表示更新指令を受信
socket.on('update_rule_fields', function(new_value)
{
	document.getElementById("selectFields").value = new_value;
});

// ==== 3.ゲーム中 =====
// サーバからゲーム画面表示指令を受信
socket.on('disp_game', function(players, game, num_of_deck)
{
	document.getElementById('viewCardMaking3').style.display = 'none';
	document.getElementById('viewGame').style.display = 'block';
});


// ==== 2.手札作成中 ====
// サーバから山札の数の表示更新指令を受信
socket.on('update_deck', function(num_of_deck)
{
	if (myPlace == AT_CARD_MAKING) {
		let elem = document.getElementById('textCardsOfDeck');
		elem.innerHTML = num_of_deck;
	}
});

// クライアントが手札を山札へ追加ボタン押下
function btnCardToDeck() {
	let elem = document.getElementById('inputCard')
	
	if (elem.value != "") {
		socket.emit('req_card_to_deck', elem.value);	// サーバへ手札を山札へ追加申請
		document.getElementById('inputCard').value = '';
	}
	else {
		alert(ERR_MSG[E_BLANK_CARD]);
	}
}

// クライアントがゲーム開始ボタン押下
function btnGameStart()
{
	var decks = document.getElementById('textCardsOfDeck').innerHTML;
	var handling_cards = document.getElementById("selectHandleCards").value;
	var players = document.getElementById('textRoomPlayers').innerHTML;
	alert("decks: " + decks + ", handling_cards: " + handling_cards + ", players: " + players);
	
	var res = confirm("ゲームを開始する？");
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


// ==== 1,入口 ====
// サーバから手札作成画面表示指令を受信
socket.on('disp_card_making', function(players, game, num_of_deck)
{
	if (myPlace == AT_ENTRANCE) {
		myPlace = AT_CARD_MAKING;
		document.getElementById('viewEntrance1').style.display = 'none';
		document.getElementById('viewEntrance2').style.display = 'none';
		document.getElementById('viewCardMaking1').style.display = 'block';
		document.getElementById('viewCardMaking2').style.display = 'block';
		document.getElementById('viewCardMaking3').style.display = 'block';
		generatTable(players);
		
		document.getElementById("selectHandleCards").value = game.rule.handlingCards;
		document.getElementById("selectFields").value = game.rule.fieldCards;

		let elem = document.getElementById('textCardsOfDeck');
		elem.innerHTML = num_of_deck;
	}
});

// サーバからプレイヤー数確認申請の応答を受信
socket.on('return_players', function(num_of_players)
{
	// ルーム内プレイヤー数更新
	let elem = document.getElementById('textRoomPlayers');
	elem.innerHTML = num_of_players;

	if (myPlace == AT_ENTRANCE) {
		if (document.getElementById("login").disabled == true) {
			document.getElementById("login").disabled = false;
		}
	}
});

// [関数]テーブル作成
function generatTable(players)
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
//				cell.setAttribute("bgcolor", players[i].color_line);
					cell.appendChild(cellText);
					row.appendChild(cell);
			}
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

// クライアントがログインボタン押下
function btnLogin()
{
	if (document.getElementById('textRoomPlayers').innerHTML < MAX_USER)
	{
		let elem = document.getElementById("inputPlayerName");
		if (elem.value != "") {
			document.getElementById("login").disabled = true;
			socket.emit('req_login', elem.value);		// サーバへログイン申請
		}
		else {
			alert(ERR_MSG[E_NO_USERNAME]);
		}
	}
	else {
		alert(ERR_MSG[E_ROOM_MAX]);
	}
}

// [関数] プレイヤー数確認
function checkPlayers()
{
	if (myPlace == AT_ENTRANCE) {
		socket.emit('req_players');	// サーバへプレイヤー数確認申請
	}
}

// サーバからメッセージ表示指令を受信
socket.on('disp_alert_message', function(msg)
{
	alert(ERR_MSG[msg]);
});
