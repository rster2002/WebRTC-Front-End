<main>
	<header>
		<video bind:this={localVideo} autoplay playsinline muted></video>
		<video bind:this={remoteVideo} autoplay playsinline></video>
	</header>
</main>

<script>
// Imports
import { onMount } from "svelte";
import WebRTC from "./WebRTC.js";

// Data
let localVideo;
let remoteVideo;

// Life-cycle
onMount(async () => {
	let rtc = new WebRTC();

	await rtc.connect();

	localVideo.srcObject = rtc.localStream;
	remoteVideo.srcObject = rtc.remoteStream;
});
</script>

<style lang="scss">
	
main {
	height: 100%;
	width: 100%;

	font-size: 1.2rem;
}

header {
	width: 100%;

	display: flex;
	flex-direction: row;
	justify-content: space-around;

	video {
		width: 40%;

		background-color: #333333;
	}
}

section	{
	display: flex;
	flex-direction: column;
	align-items: center;
}
	
</style>