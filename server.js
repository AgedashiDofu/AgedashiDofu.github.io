// ==== �e�탂�W���[������ ====
var express = require('express');
var http = require( 'http' );
var socketIO = require('socket.io');
var app = express();		// express�A�v���P�[�V��������
var server = http.Server( app );
var io = socketIO( server );

// ���J�t�H���_�̎w��
app.use( express.static( __dirname + '/public' ) );

// �T�[�o�[�̋N��
const PORT_NO = process.env.PORT || 1337;	// �|�[�g�ԍ��i���ϐ�PORT������΂�����A�������1337���g���j
server.listen(
	PORT_NO,	// �|�[�g�ԍ�
	() =>
	{
		console.log( 'Starting server on port %d', PORT_NO );
	} );

// socket.io��ݒ�
io.attach(server);

// ==== �萔 ====
const OK = 1;
const NG = 0;
const MAX_USER = 7;					// �ő�v���C���[
const AT_ENTRANCE    = 0;			// �v���C���[�̏ꏊ�F����
const AT_CARD_MAKING = 1;			// �v���C���[�̏ꏊ�F��D�쐬
const AT_PLAYING     = 2;			// �v���C���[�̏ꏊ�F�Q�[����
const FIELD_UPPER  = 0;				// ��̋�
const FIELD_MIDDLE = 1;				// ���̋�
const FIELD_BOTTOM = 2;				// ���̋�
const ID_NO_USE = 0;				// ID���g�p
const ID_USED   = 1;				// ID�g�p�ς�
const E_ROOM_MAX       = 0;			// E-00
const E_NO_USERNAME    = 1;			// E-01
const E_BLANK_CARD     = 2;			// E-02
const E_FULL_HANDLINGS = 3;			// E-03
const E_EMPTY_DECK     = 4;			// E-04
const E_CANT_CHG_RULE_HAND = 5;		// E-05
const PLAYER_LINE_COLOR = ["red",    "blue",        "yellow",       "green",          "purple",        "greenyellow", "magenta"];
const PLAYER_BACK_COLOR = ["coral", "lightskyblue", "lemonchiffon", "mediumseagreen", "mediumorchid",  "yellowgreen", "plum"   ];

// ==== �ϐ� ====
var deckCards = new Array();		// �R�D
var fieldCards = [ "", "", "" ];	// ��D
var players   = new Array();		// �v���C���[
var game = {
	turn: 1,									// �^�[��
	rule: {"handlingCards":5, "fieldCards": 3},	// ���[��
	theme: ""
};

// ==== �֐� ====
// �ڑ��m�����̏���
io.sockets.on('connection', function(socket) {
	// �ڑ��ؒf����
	socket.on('disconnect', function() {
		console.log("disconnect");
		console.log("[before]players: " + players.length);
		for (let i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {	// Socket ID����v����
				players.splice(i, 1);					// �v���C���[���폜
			}
		}
		console.log("[after] players: " + players.length);
		socket.broadcast.emit('fluctuation_player', players);
	});

	console.log("connect");
	
	// ���O�C���\������M
	socket.on('req_login', function(userName) {
		if (players.length < MAX_USER) {
			var socket_id = socket.id;
			
			var id = issueID();			// ID�𔭍s
			if (id != -1) {
			
				// �v���C���[��񐶐�
				let player = {
					"id":id,							// ID�i�J���[�����O�p�j
					"socket_id":socket_id,
					"name":userName,					// ���O
					"color_line":PLAYER_LINE_COLOR[id],	// �g�̐F
					"color_back":PLAYER_BACK_COLOR[id],	// ���X�g�̐F
					"at":AT_CARD_MAKING,				// �v���C���[�̈ʒu
				};
				player.handlingCards = new Array();		// ��D
				players.push(player);					// �v���C���[�ǉ�
				console.log("players: " + players.length);
				console.log(player);

				socket.join('room');
				
				socket.broadcast.emit('fluctuation_player', players);	// ���̃v���C���[�֒ʒm
				
				// ��D�쐬��ʕ\��
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
	
	// �v���C���[���m�F�\������M
	socket.on('req_players', function() {
		io.emit('return_players', players.length); 								// �ڑ��v���C���[�֕ԐM
	});

	// ��D���R�D�֒ǉ��\������M
	socket.on('req_card_to_deck', function(addCard) {
		console.log("add card: " + addCard);
		deckCards.push(addCard);
		io.to('room').emit('fluctuation_deck', deckCards.length);					// ���[�������o�[�֋��L
	});
	
	// ���[���ύX�i��D�̐��j�\������M
	socket.on('req_chg_rule_handlings', function(req) {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		if (game.rule.handlingCards != req) {
			// ���[���ɕύX����
			if (judgeChageableRuleHandlings(req) == OK) {				// ���[���ύX�i��D�̐��j�\���̉�/�s����
				// ���[���ύX��
				game.rule.handlingCards = req;
				io.to('room').emit('fluctuation_rule_handlings', game.rule.handlingCards);	// ���[�������o�[�֋��L
			}
			else {
				// ���[���ύX�s��
				io.to(players[i].socket_id).emit('disp_alert_message', E_CANT_CHG_RULE_HAND);	// ���[���ύX�ł��Ȃ����b�Z�[�W
				io.to(players[i].socket_id).emit('restore_rule_handlings', game.rule.handlingCards);	// �\�������ɖ߂��w��
			}
		}
		else {
			// ���[���ɕύX�Ȃ�
		}
	});
	
	// ���[���ύX�i��̐��j�\������M
	socket.on('req_chg_rule_fields', function(req) {
		if (game.rule.fieldCards != req) {
			game.rule.fieldCards = req;
			io.to('room').emit('fluctuation_rule_fields', game.rule.fieldCards);			// ���[�������o�[�֋��L
		}
	});

	// �Q�[���J�n�\������M
	socket.on('req_game_start', function(req) {
		initGameSystem();														// �Q�[���V�X�e��������
		io.to('room').emit('disp_game', game, deckCards.length, players);		// ���[�������o�[�֋��L
	});

	// �v���C���[����v������M
	socket.on('req_player_info', function() {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		io.to(players[i].socket_id).emit('player_information', game.rule.handlingCards, players[i]);		// �v�����փv���C���[��������
	});

	// �T�[�o�֎�D��o�v��
	socket.on('req_card_to_field', function(now_select, selectCard) {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		if ((game.rule.handlingCards == 2) && (now_select == FIELD_MIDDLE) ||	// 2�����[���A�����̋�̂Ƃ�
			(fieldCards[now_select] != "")) {									// �ꂪ��łȂ��Ƃ�
			// �������Ȃ�
			console.log("req_card_to_field : fail");
		}
		else {
			console.log("req_card_to_field : success");
			fieldCards[now_select] = players[i].handlingCards[selectCard];		// ��D����փR�s�[
			players[i].handlingCards.splice(selectCard, 1);						// �I�𒆂̎�D���폜
			
			socket.broadcast.emit('fluctuation_cards', players, fieldCards);	// ���̃v���C���[�֒ʒm
			io.to(players[i].socket_id).emit('success_card_to_field', players);	// �v�����֐�������
		}
	});
	
	// ��̏��v������M
	socket.on('req_fields_information', function() {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		io.to(players[i].socket_id).emit('fields_information', game.rule.fieldCards, fieldCards);	// �v�����֏�̏�������
	});
	
	// �R�D����h���[�v������M
	socket.on('req_draw_from_deck', function() {
		var i;
		for (i = 0; i < players.length; i++) {
			if (players[i].socket_id == socket.id) {
				break;
			}
		}
		
		if (deckCards.length > 0) {
			if (players[i].handlingCards.length < game.rule.handlingCards) {
				players[i].handlingCards.push(deckCards[0]);						// �R�D�擪�J�[�h����D�ɉ�����
				deckCards.shift();													// �R�D�擪�J�[�h�폜
				
				socket.broadcast.emit('fluctuation_player', players);				// ���̃v���C���[�֒ʒm
				socket.broadcast.emit('fluctuation_deck', deckCards.length);		// ���̃v���C���[�֒ʒm
				io.to(players[i].socket_id).emit('success_draw', deckCards.length, players);	// �v�����֐�������
			}
			else {
				io.to(players[i].socket_id).emit('disp_alert_message', E_FULL_HANDLINGS);		// ��D�����ς����b�Z�[�W
			}
		}
		else {
			io.to(players[i].socket_id).emit('disp_alert_message', E_EMPTY_DECK);				// �R�D���Ȃ����b�Z�[�W
		}
	});
	
	// ����\������M
	socket.on('req_input_theme', function(new_theme) {
		game.theme = new_theme;
		
		io.to('room').emit('fluctuation_theme', new_theme);		// ���[�������o�[�֋��L
	});

	// ���^�[���ڍs�\������M
	socket.on('req_next_turn', function() {
		fieldCards[FIELD_UPPER]  = "";							// ��̋�
		fieldCards[FIELD_MIDDLE] = "";							// ���̋�
		fieldCards[FIELD_BOTTOM] = "";							// ���̋�
		game.turn++;											// �^�[�����C���N�������g
		
		// ���[�������o�[�֋��L
		io.to('room').emit('fields_information', game.rule.fieldCards, fieldCards);
		io.to('room').emit('fluctuation_turn', game.turn);
	});
});

// ���[�UID�̔��s
function issueID()
{
	var serch_id;
	var i;
	var new_id = -1;
	
	for (serch_id = 0; serch_id < MAX_USER; serch_id++) {
		for (i = 0; i < players.length; i++) {
			if (serch_id == players[i].id) {	// serch_id�͔��s�ς�
				break;							// ����serch_id��
			}
		}

		if (i == players.length) {				// �S�v���C���[�m�F�ς�
			new_id = serch_id;					// ID���s
			break;								// ����
		}
	}
	
	return new_id;
}

// �Q�[���V�X�e��������
function initGameSystem()
{
	shuffleDeckCards();							// �R�D���V���b�t��
	handOutCards();								// �R�D����e�v���C���[�֔z��
}

// �R�D���V���b�t��
function shuffleDeckCards()
{
	for (let i = deckCards.length; 1 < i; i--) {
		let k = Math.floor(Math.random() * i);
		[deckCards[k], deckCards[i - 1]] = [deckCards[i - 1], deckCards[k]];
	}
}

// �R�D����e�v���C���[�֎D��z��
function handOutCards()
{
	for (let i = 0; i < players.length; i++) {
		for (let j = 0; j < game.rule.handlingCards; j++) {
			players[i].handlingCards.push(deckCards[0]);	// �R�D�̐擪�̃J�[�h��ǉ�
			deckCards.shift();								// �擪�J�[�h���폜
		}
	}
}

// ���[���ύX�i��D�̐��j�\���̉�/�s����
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
