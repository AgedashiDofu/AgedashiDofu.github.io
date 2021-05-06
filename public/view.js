// ==== 定数 ====
// ---- 表示位置パラメータ ----
// 手札
const HDL_X      = 120;			// 左上の手札のx座標
const HDL_Y      = 330;			// 左上の手札のy座標

const HDL_W      = 300;			// 手札の幅
const HDL_H      = 20;			// 手札の高さ
const HDL_GAP    = 10;			// 手札の隙間

const HDL_TEXT_X = HDL_X + (HDL_W / 2);		// ワードのx座標
const HDL_CRACK  = 14;			// 手札とワードのずれ

const HDL_EMP_F_WEIGHT = 3;		// 手札（空）の枠線の太さ
const HDL_EMP_F_LENGTH = 15;	// 手札（空）の枠線の長さ

// 場
const FLD_X      = 100;			// 場（上の句）のx座標
const FLD_Y      = 170;			// 場（上の句）のy座標

const FLD_W      = 340;			// 場の幅
const FLD_H      = 30;			// 場の高さ
const FLD_GAP    = 14;			// 場の隙間

const FLD_TEXT_X = FLD_X + (FLD_W / 2);		// ワードのx座標
const FLD_CRACK  = 20;			// 場札とワードのずれ

const FLD_EMP_F_WEIGHT = 6;		// 場（空）の枠線の太さ
const FLD_EMP_F_LENGTH = 30;	// 場（空）の枠線の長さ

const FLD2RULE_Y_AJST = 14;		// 場2枚ルール時のy位置調整

// 山札
const DECK_X     = 220;			// 山札のx座標
const DECK_Y     = 30;			// 山札のy座標
const DECK_W     = 64;			// 山札の幅
const DECK_H     = 64;			// 山札の高さ

// お題
const THEME_X     = 100;		// お題のx座標
const THEME_Y     = 120;		// お題のy座標
const THEME_W     = 340;		// お題の幅
const THEME_H     = 30;			// お題の高さ

const THEME_TEXT_X = THEME_X + (THEME_W / 2);	// ワードのx座標
const THEME_TEXT_Y = THEME_Y + 20;				// ワードのy座標

// 手札描画位置
const cardRect = [
	{ x: HDL_X, y: (HDL_Y + (HDL_H + HDL_GAP) * 0) },	// 1
	{ x: HDL_X, y: (HDL_Y + (HDL_H + HDL_GAP) * 1) },	// 2
	{ x: HDL_X, y: (HDL_Y + (HDL_H + HDL_GAP) * 2) },	// 3
	{ x: HDL_X, y: (HDL_Y + (HDL_H + HDL_GAP) * 3) },	// 4
	{ x: HDL_X, y: (HDL_Y + (HDL_H + HDL_GAP) * 4) },	// 5
	{ x: HDL_X, y: (HDL_Y + (HDL_H + HDL_GAP) * 5) }	// 6
];

// ワード（手札）描画位置
const handlingTextRect = [
	{ x: HDL_TEXT_X, y: (cardRect[0].y + HDL_CRACK) },		// 1
	{ x: HDL_TEXT_X, y: (cardRect[1].y + HDL_CRACK) },		// 2
	{ x: HDL_TEXT_X, y: (cardRect[2].y + HDL_CRACK) },		// 3
	{ x: HDL_TEXT_X, y: (cardRect[3].y + HDL_CRACK) },		// 4
	{ x: HDL_TEXT_X, y: (cardRect[4].y + HDL_CRACK) },		// 5
	{ x: HDL_TEXT_X, y: (cardRect[5].y + HDL_CRACK) }		// 6
];

// 場描画位置（3枚ルールと2枚ルールでyの位置を変えるため、const→varとした）
var fieldRect = [
	{ x: FLD_X, y: (FLD_Y + (FLD_H + FLD_GAP) * 0) },		// 上の句
	{ x: FLD_X, y: (FLD_Y + (FLD_H + FLD_GAP) * 1) },		// 中の句
	{ x: FLD_X, y: (FLD_Y + (FLD_H + FLD_GAP) * 2) }		// 下の句
];

// ワード（場）描画位置（3枚ルールと2枚ルールでyの位置を変えるため、const→varとした）
var fieldTextRect = [
	{ x: FLD_TEXT_X, y: (fieldRect[0].y + FLD_CRACK) },		// 上の句
	{ x: FLD_TEXT_X, y: (fieldRect[1].y + FLD_CRACK) },		// 中の句
	{ x: FLD_TEXT_X, y: (fieldRect[2].y + FLD_CRACK) }		// 下の句
];

// ---- 制御用定数 ----
const ON  = 1;
const OFF = 0;
const FIELD_UPPER  = 0;				// 上の句
const FIELD_MIDDLE = 1;				// 中の句
const FIELD_BOTTOM = 2;				// 下の句
const H_CARD_NO_SEL = -1;			// 手札選択なし

// ----- リミット -----
const MAX_HANDLING_CARDS = 6;
const MAX_FIELD_CARDS = 3;


// ==== 変数 ====
var selectCard = H_CARD_NO_SEL;		// 選択している手札（-1：選択なし）
var canvasContext;					// CANVASコンテキスト
var imgCard;						// カード画像
var imgDeck;						// 山札画像


// 画像ファイルプリロード
function preloadImage()
{
	// カード画像読み込み
	imgCard = new Image();
	imgCard.src = 'card.png';
	
	// 山札画像読み込み
	imgDeck = new Image();
	imgDeck.src = 'deck.png';
}

// ゲーム初期画面描画
function drawGameInit(ruleHandlingCards, ruleFieldCards, num_of_deck)
{
	var elemCanvas = document.getElementById('drawCanvas');

	canvasContext = elemCanvas.getContext('2d');
	var cvs = canvasContext;
	
	// 初期画面描画
	drawInitDisp(cvs, ruleHandlingCards, ruleFieldCards, num_of_deck);
	
	// クリック判定
	elemCanvas.addEventListener("click", e => {
		// マウスの座標をCanvas内の座標とあわせるため
		const rect = elemCanvas.getBoundingClientRect();
		const point = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
		var jaddje_done;
		
		// 手札クリック判定
		jaddje_done = clickCheckHandling(cvs, point.x, point.y);
		if (jaddje_done == 0) {
			
			// 場クリック判定
			jaddje_done = clickCheckField(cvs, point.x, point.y);
			
			if (jaddje_done == 0) {
				
				// 山札クリック判定
				jaddje_done = clickCheckDeck(cvs, point.x, point.y);
			}
		}
	});
}

// 手札クリック判定
function clickCheckHandling(cvs, x, y)
{
	var now_select = 0;
	var found = 0;

	// ==== クリック判定 ====
	for ( ; now_select < getMyHandCards(); now_select++) {
		// 手札がクリックされたかチェック
		if(   (cardRect[now_select].x <= x && x <= cardRect[now_select].x + HDL_W)		// 横方向の判定
		   && (cardRect[now_select].y <= y && y <= cardRect[now_select].y + HDL_H)) {	// 縦方向の判定
			found = 1;						// 発見！
			break;
		}
	}

	// ==== クリック動作 ====
	if (found != 0) {
		if (now_select == selectCard) {		// 同じ手札を選択
			selectCard = H_CARD_NO_SEL;		// 選択解除
		}
		else {
			selectCard = now_select;		// 更新
		}
		updateHandlingCards();				// 手札再描画
	}
	
	return found;
}

// 場クリック判定
function clickCheckField(cvs, x, y)
{
	var now_select = 0;
	var found = 0;

	// ==== クリック判定 ====
	for ( ; now_select < MAX_FIELD_CARDS; now_select++) {
		// 場がクリックされたかチェック
		if(   (fieldRect[now_select].x <= x && x <= fieldRect[now_select].x + FLD_W)	// 横方向の判定
		   && (fieldRect[now_select].y <= y && y <= fieldRect[now_select].y + FLD_H)) {	// 縦方向の判定
			found = 1;						// 発見！
			break;
		}
	}

	// ==== クリック動作 ====
	if (found != 0) {
		if (selectCard == H_CARD_NO_SEL) {		// 手札を選択していないとき
			// 何もしない
		}
		else {
			reqCardToField(now_select, selectCard);		// 手札提出要求
		}
	}
	
	return found;
}

// 手札選択解除
function cancelSelCard()
{
	selectCard = H_CARD_NO_SEL;					// 手札選択解除
}

// 山札クリック判定
function clickCheckDeck(cvs, x, y)
{
	var found = 0;
	
	// 山札がクリックされたかチェック
	if(   (DECK_X <= x && x <= DECK_X + DECK_W)		// 横方向の判定
	   && (DECK_Y <= y && y <= DECK_Y + DECK_H)) {	// 縦方向の判定
		found = 1;						// 発見！
	}
	
	// ==== クリック動作 ====
	if (found != 0) {
		reqDrawFromDeck();						// 山札からドロー要求
	}

	return found;
}

// 初期画面描画
function drawInitDisp(cvs, ruleHandlingCards, ruleFieldCards, num_of_deck)
{
	let dummyThemeCard = "";
	let dummyHandlingCards = new Array();
	let dummyFieldCards = ["", "", ""];
	
	// 説明文字描画
	drawStrings(cvs);
	
	// お題描画
	updateTheme(dummyThemeCard);
	
	// 全手札描画
	drawAllHandlingCards(dummyHandlingCards, ruleHandlingCards);

	// 場描画
	drawAllFields(dummyFieldCards, ruleFieldCards);

	// 山札描画
	drawDeck(cvs);							// 画像
	updateNumOfDeck(num_of_deck);			// 枚数
};

// 説明文字描画
function drawStrings(cvs)
{
	cvs.beginPath();
	
	cvs.lineWidth = 3; cvs.strokeStyle = "black"; cvs.fillStyle = "white";
	cvs.font = "18px sans-serif";
	cvs.strokeText("山札", 150, 70);
	cvs.fillText("山札",   150, 70);
	
	cvs.strokeText("お題", 30, 140);
	cvs.fillText("お題",   30, 140);

	cvs.strokeText("上の句", 25, 190);
	cvs.fillText("上の句",   25, 190);

	cvs.strokeText("中の句", 25, 234);
	cvs.fillText("中の句",   25, 234);

	cvs.strokeText("下の句", 25, 278);
	cvs.fillText("下の句",   25, 278);

	cvs.strokeText("手札", 50, 348);
	cvs.fillText("手札",   50, 348);
}

// 山札描画
function drawDeck(cvs)
{
	cvs.beginPath();
	
	// 画像読み込み
	cvs.drawImage(imgDeck, DECK_X, DECK_Y, DECK_W, DECK_H);

}

// 山札数更新
function updateNumOfDeck(num_of_deck)
{
	var cvs = canvasContext;
	
	clearNumOfDeck(cvs);				// 消去
	drawNumOfDeck(cvs, num_of_deck);	// 描画
}

// 山札数描画
function drawNumOfDeck(cvs, num_of_deck)
{
	var str = num_of_deck  + "枚";
	
	cvs.beginPath();

	cvs.lineWidth = 3; cvs.strokeStyle = "black"; cvs.fillStyle = "white";
	cvs.font = "18px sans-serif";
	cvs.strokeText(str, 330, 72);
	cvs.fillText(str, 330, 72);
}

// 山札数消去
function clearNumOfDeck(cvs)
{
	cvs.beginPath();

	cvs.fillStyle = "darkgreen";
	cvs.rect(296, 50, 80, 30);
	cvs.fill();
}

// お題の更新
function updateTheme(themeCard)
{
	var cvs = canvasContext;
	
	drawThemeFrame(cvs);			// 枠
	drawTheme(cvs, themeCard);		// 札
}

// お題の描画
function drawTheme(cvs, themeCard)
{
	cvs.beginPath();

	cvs.fillStyle = "white";
	cvs.rect(THEME_X, THEME_Y, THEME_W, THEME_H);
	cvs.fill();

	cvs.beginPath();
	
	// ワード書き込み
	cvs.fillStyle = "black";
	cvs.font = "14px serif";
	cvs.textAlign = "center";
	cvs.fillText(themeCard, THEME_TEXT_X, THEME_TEXT_Y, THEME_W);
}

// お題の枠描画
function drawThemeFrame(cvs)
{
	cvs.beginPath();
	
	cvs.fillStyle = "khaki";
	cvs.rect(THEME_X - 6, THEME_Y - 6, THEME_W + 12, THEME_H + 12);
	cvs.fill();

	cvs.beginPath();
	
	cvs.fillStyle = "black";
	cvs.rect(THEME_X - 2, THEME_Y - 2, THEME_W + 4, THEME_H + 4);
	cvs.fill();
}

// 全手札の描画
function drawAllHandlingCards(handlingCards, ruleHandlingCards)
{
	var cvs = canvasContext;
	var i = 0;

	// 手札を描画
	for ( ; i < handlingCards.length; i++) {
		if (i == selectCard) {
			drawHandlingCard(cvs, handlingCards, i, ON);	// 手札描画（選択あり）
		}
		else {
			drawHandlingCard(cvs, handlingCards, i, OFF);	// 手札描画（選択なし）
		}
	}
	// 手札（空き）を描画
	for ( ; i < ruleHandlingCards; i++) {
		drawHandlingCardEmpty(cvs, i);			// 手札（空）描画
	}
	// 手札（無）を描画
	for ( ; i < MAX_HANDLING_CARDS; i++) {
		drawHandlingCardNone(cvs, i);			// 手札（空）描画
	}
}

// 手札描画
function drawHandlingCard(cvs, handlingCards, target, select_sw)
{
	cvs.beginPath();

	// 矩形描画
	cvs.fillStyle = "darkgreen";
	cvs.rect(cardRect[target].x, cardRect[target].y, HDL_W, HDL_H);
	cvs.fill();
	
	// カード画像描画
	cvs.drawImage(imgCard, cardRect[target].x, cardRect[target].y, HDL_W, HDL_H);
	
	if (select_sw != OFF) {
		drawCardFrame(cvs);					// 枠付加
	}

	cvs.beginPath();
	
	// ワード書き込み
	cvs.fillStyle = "black";
	cvs.font = "12px serif";
	cvs.textAlign = "center";
	cvs.fillText(handlingCards[target], handlingTextRect[target].x, handlingTextRect[target].y, HDL_W);
}

// 手札（空）描画
function drawHandlingCardEmpty(cvs, target)
{
	cvs.beginPath();
	
	// 枠描画
	cvs.fillStyle = "#411C00";
	cvs.rect(cardRect[target].x, cardRect[target].y, HDL_W, HDL_H);
	cvs.fill();
	
	cvs.beginPath();
	
	// 背景描画
	cvs.fillStyle = "#005400";
	cvs.rect(cardRect[target].x + HDL_EMP_F_WEIGHT, 
			 cardRect[target].y + HDL_EMP_F_WEIGHT, 
			 HDL_W - (HDL_EMP_F_WEIGHT * 2), 
			 HDL_H - (HDL_EMP_F_WEIGHT * 2));
	cvs.fill();
	
	cvs.beginPath();
	
	// 背景描画
	cvs.fillStyle = "#005400";
	cvs.rect(cardRect[target].x + HDL_EMP_F_LENGTH, 
			 cardRect[target].y, 
			 HDL_W - (HDL_EMP_F_LENGTH * 2), 
			 HDL_H);
	cvs.fill();
}

// 手札（無）描画
function drawHandlingCardNone(cvs, target)
{
	cvs.beginPath();

	// 矩形描画
	cvs.fillStyle = "darkgreen";
	cvs.rect(cardRect[target].x, cardRect[target].y, HDL_W, HDL_H);
	cvs.fill();
}

// 枠付加
function drawCardFrame(cvs)
{
	cvs.globalCompositeOperation = "source-atop";
	cvs.strokeStyle = "red";
	cvs.lineWidth = 5;
	cvs.stroke();
}

// 全場の更新
function drawAllFields(fieldCards, ruleFieldCards)
{
	var cvs = canvasContext;
	var i = 0;

	// 場（空き）を描画
	for ( ; i < MAX_FIELD_CARDS; i++) {
		if (i == FIELD_MIDDLE && ruleFieldCards == 2) {
			drawCardFieldNone(cvs, i);			// 場（無）描画
		}
		else {
			// 場に札がある場合
			if (fieldCards[i] != "") {
				drawField(cvs, fieldCards, i);	// 場描画
			}
			// 場に札がない場合
			else {
				drawCardFieldEmpty(cvs, i);		// 場（空）描画
			}
		}
	}
}

// 場描画
function drawField(cvs, fieldCards, target)
{
	cvs.beginPath();

	// 矩形描画
	cvs.fillStyle = "darkgreen";
	cvs.rect(fieldRect[target].x, fieldRect[target].y, FLD_W, FLD_H);
	cvs.fill();
	
	cvs.beginPath();
	
	// カード画像描画
	cvs.drawImage(imgCard, fieldRect[target].x, fieldRect[target].y, FLD_W, FLD_H);
	
	cvs.beginPath();
	
	// ワード書き込み
	cvs.fillStyle = "black";
	cvs.font = "14px serif";
	cvs.textAlign = "center";
	cvs.fillText(fieldCards[target], fieldTextRect[target].x, fieldTextRect[target].y, FLD_W);
}

// 場（空）描画
function drawCardFieldEmpty(cvs, target)
{
	cvs.beginPath();
	
	// 枠描画
	cvs.fillStyle = "#411C00";
	cvs.rect(fieldRect[target].x, fieldRect[target].y, FLD_W, FLD_H);
	cvs.fill();
	
	cvs.beginPath();
	
	// 背景描画
	cvs.fillStyle = "#005400";
	cvs.rect(fieldRect[target].x + FLD_EMP_F_WEIGHT, 
			 fieldRect[target].y + FLD_EMP_F_WEIGHT, 
			 FLD_W - (FLD_EMP_F_WEIGHT * 2), 
			 FLD_H - (FLD_EMP_F_WEIGHT * 2));
	cvs.fill();

	cvs.beginPath();
	
	// 背景画
	cvs.fillStyle = "#005400";
	cvs.rect(fieldRect[target].x + FLD_EMP_F_LENGTH, 
			 fieldRect[target].y, 
			 FLD_W - (FLD_EMP_F_LENGTH * 2), 
			 FLD_H);
	cvs.fill();
}

// 場（無）描画
function drawCardFieldNone(cvs, target)
{
	cvs.beginPath();

	// 矩形描画
	cvs.fillStyle = "darkgreen";
	cvs.rect(fieldRect[target].x, fieldRect[target].y, FLD_W, FLD_H);
	cvs.fill();
}

// 場消去
function clearFields(cvs)
{
	cvs.beginPath();

	// 矩形描画
	cvs.fillStyle = "darkgreen";
	cvs.rect(FLD_X, FLD_Y, FLD_W, (FLD_H * 3) + (FLD_GAP * 2));
	cvs.fill();
}


