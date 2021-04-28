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
const MAX_USER = 7;					// �ő�v���C���[
const AT_ENTRANCE    = 0;			// �v���C���[�̏ꏊ�F����
const AT_CARD_MAKING = 1;			// �v���C���[�̏ꏊ�F��D�쐬
const AT_PLAYING     = 2;			// �v���C���[�̏ꏊ�F�Q�[����
const ID_NO_USE = 0;				// ID���g�p
const ID_USED   = 1;				// ID�g�p�ς�
const E_ROOM_MAX = 0;				// E-00
const PLAYER_LINE_COLOR = ["red",    "blue",        "yellow",       "green",          "purple",        "greenyellow", "magenta"];
const PLAYER_BACK_COLOR = ["coral", "lightskyblue", "lemonchiffon", "mediumseagreen", "mediumorchid",  "yellowgreen", "plum"   ];

// ==== �ϐ� ====
var deckCards = new Array();	// �R�D
var players   = new Array();	// �v���C���[
var game = {
	turn: 0,									// �^�[��
	rule: {"handlingCards":5, "fieldCards": 3},	// ���[��
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
				players.splice(i, 1);				// �v���C���[���폜
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
					"id":id,
					"socket_id":socket_id,
					"name":userName,
					"color_line":PLAYER_LINE_COLOR[id],
					"color_back":PLAYER_BACK_COLOR[id],
					"at":AT_CARD_MAKING,
				};
				players.push(player);		// �v���C���[�ǉ�
				console.log("players: " + players.length);
				console.log(player);

				socket.join('room');
				
				// ���̃v���C���[�֒ʒm
				socket.broadcast.emit('fluctuation_player', players);
				
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
		io.to('room').emit('update_deck', deckCards.length);					// ���[�������o�[�֋��L
	});
	
	// ���[���ύX�i��D�̐��j�\������M
	socket.on('req_chg_rule_handlings', function(req) {
		game.rule.handlingCards = req;
		io.to('room').emit('update_rule_handlings', game.rule.handlingCards);	// ���[�������o�[�֋��L
	});
	
	// ���[���ύX�i��̐��j�\������M
	socket.on('req_chg_rule_fields', function(req) {
		game.rule.fieldCards = req;
		io.to('room').emit('update_rule_fields', game.rule.fieldCards);			// ���[�������o�[�֋��L
	});

	// �Q�[���J�n�\������M
	socket.on('req_game_start', function(req) {
		io.to('room').emit('disp_game', players, game, deckCards.length);		// ���[�������o�[�֋��L
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
			if (serch_id == players[i].id) {		// serch_id�͔��s�ς�
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
