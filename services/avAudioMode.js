import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

// Called once (see VideoSoundContext's mount effect) rather than per-video —
// this is a global audio-session setting, not a per-player one.
// playsInSilentModeIOS: false is the deliberate choice here: it makes iOS's
// hardware mute switch silence video audio even when the in-app "sound on"
// state is true, matching this feature's hardware-mute-switch requirement.
export async function configureVideoAudioModeAsync() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: false,
    playsInSilentModeIOS: false,
    interruptionModeIOS: InterruptionModeIOS.DoNotMix,
    shouldDuckAndroid: true,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    playThroughEarpieceAndroid: false,
  });
}
