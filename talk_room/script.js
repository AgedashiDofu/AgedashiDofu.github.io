const Peer = window.Peer;
const roomId = "KamiToPenOnline";
const roomMode = "sfu";
//const roomMode = "mesh";

(async function main() {
	const localVideo = document.getElementById('js-local-stream');
	const joinTrigger = document.getElementById('js-join-trigger');
	const leaveTrigger = document.getElementById('js-leave-trigger');
	const remoteVideos = document.getElementById('js-remote-streams');
	const localText = document.getElementById('js-local-text');
	const sendTrigger = document.getElementById('js-send-trigger');
	const messages = document.getElementById('js-messages');
//	const meta = document.getElementById('js-meta');
//	const sdkSrc = document.querySelector('script[src*=skyway]');

//	meta.innerText = `
//		UA: ${navigator.userAgent}
//		SDK: ${sdkSrc ? sdkSrc.src : 'unknown'}
//	`.trim();

	const localStream = await navigator.mediaDevices
		.getUserMedia({
			audio: true,
			video: true,
		})
		.catch(console.error);

	// Render local stream
	localVideo.muted = true;
	localVideo.srcObject = localStream;
	localVideo.playsInline = true;
	await localVideo.play().catch(console.error);

	// eslint-disable-next-line require-atomic-updates
	const peer = (window.peer = new Peer({
		key: window.__SKYWAY_KEY__,
		debug: 3,
	}));

	// トークルームに入るボタンクリック
	joinTrigger.addEventListener('click', () => {
		// Note that you need to ensure the peer has connected to signaling server
		// before using methods of peer instance.
		if (!peer.open) {
			return;
		}

		const room = peer.joinRoom(roomId, {
			mode: roomMode,
			stream: localStream,
		});

		room.once('open', () => {
			messages.textContent += '==== 部屋に入ったよ ====\n';
		});
		room.on('peerJoin', peerId => {
			messages.textContent += '==== 誰か部屋に来たよ ====\n';
		});

		// Render remote stream for new peer join in the room
		room.on('stream', async stream => {
			const newVideo = document.createElement('video');
			newVideo.srcObject = stream;
			newVideo.playsInline = true;
			// mark peerId to find it later at peerLeave event
			newVideo.setAttribute('data-peer-id', stream.peerId);
			remoteVideos.append(newVideo);
			await newVideo.play().catch(console.error);
		});

		room.on('data', ({ data, src }) => {
			// Show a message sent to the room and who sent
//			messages.textContent += `${src}: ${data}\n`;
			messages.textContent += `${data}\n`;
		});

		// for closing room members
		room.on('peerLeave', peerId => {
			const remoteVideo = remoteVideos.querySelector(
			  `[data-peer-id="${peerId}"]`
			);
			remoteVideo.srcObject.getTracks().forEach(track => track.stop());
			remoteVideo.srcObject = null;
			remoteVideo.remove();

			messages.textContent += '==== 誰かが部屋を出たよ ====\n';
		});

		// for closing myself
		room.once('close', () => {
			sendTrigger.removeEventListener('click', onClickSend);
			messages.textContent += '==== 部屋を出たよ ====\n';
			Array.from(remoteVideos.children).forEach(remoteVideo => {
			  remoteVideo.srcObject.getTracks().forEach(track => track.stop());
			  remoteVideo.srcObject = null;
			  remoteVideo.remove();
			});
		});

		// チャットを送信ボタンクリック
		sendTrigger.addEventListener('click', onClickSend);
		
		// トークルームを出るボタンクリック
		leaveTrigger.addEventListener('click', () => room.close(), { once: true });

		function onClickSend() {
			// Send message to all of the peers in the room via websocket
			room.send(localText.value);

			messages.textContent += `${localText.value}\n`;
			localText.value = '';
		}
	});

	peer.on('error', console.error);
})();