import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkButton, GtkFrame, GtkImage, GtkLabel, GtkProgressBar, GtkScale } from "@gtkx/react";
import { useMemo, useState } from "react";
import type { Demo } from "../types.js";

const AudioDemo = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.75);
    const [progress, _setProgress] = useState(0.35);
    const volumeAdjustment = useMemo(() => new Gtk.Adjustment(0.75, 0, 1, 0.05, 0.1, 0), []);

    return (
        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={24}>
            <GtkLabel label="Audio Playback" cssClasses={["title-2"]} halign={Gtk.Align.START} />

            <GtkLabel
                label="Audio playback in GTK4 uses the same GtkMediaStream infrastructure as video. While there is no dedicated audio-only widget, you can use GtkVideo without displaying video content, or work directly with GtkMediaStream for custom audio implementations."
                wrap
                halign={Gtk.Align.START}
                cssClasses={["dim-label"]}
            />

            {/* Simulated Audio Player UI */}
            <GtkFrame label="Audio Player UI">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={16}
                    marginBottom={16}
                    marginStart={16}
                    marginEnd={16}
                >
                    {/* Track Info */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={16}>
                        <GtkBox
                            orientation={Gtk.Orientation.VERTICAL}
                            spacing={0}
                            cssClasses={["card"]}
                            widthRequest={80}
                            heightRequest={80}
                            halign={Gtk.Align.CENTER}
                            valign={Gtk.Align.CENTER}
                        >
                            <GtkImage
                                iconName="audio-x-generic-symbolic"
                                pixelSize={48}
                                halign={Gtk.Align.CENTER}
                                valign={Gtk.Align.CENTER}
                            />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} valign={Gtk.Align.CENTER} hexpand>
                            <GtkLabel label="Example Audio Track" halign={Gtk.Align.START} cssClasses={["heading"]} />
                            <GtkLabel label="Artist Name" halign={Gtk.Align.START} cssClasses={["dim-label"]} />
                            <GtkLabel
                                label="Album Title"
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label", "caption"]}
                            />
                        </GtkBox>
                    </GtkBox>

                    {/* Progress */}
                    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4}>
                        <GtkProgressBar fraction={progress} hexpand />
                        <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={0} hexpand>
                            <GtkLabel
                                label="1:23"
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label", "caption"]}
                                hexpand
                            />
                            <GtkLabel label="3:45" halign={Gtk.Align.END} cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                    </GtkBox>

                    {/* Playback Controls */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkButton cssClasses={["flat", "circular"]}>
                            <GtkImage iconName="media-playlist-shuffle-symbolic" pixelSize={20} />
                        </GtkButton>
                        <GtkButton cssClasses={["flat", "circular"]}>
                            <GtkImage iconName="media-skip-backward-symbolic" pixelSize={24} />
                        </GtkButton>
                        <GtkButton
                            cssClasses={["suggested-action", "circular"]}
                            widthRequest={48}
                            heightRequest={48}
                            onClicked={() => setIsPlaying(!isPlaying)}
                        >
                            <GtkImage
                                iconName={isPlaying ? "media-playback-pause-symbolic" : "media-playback-start-symbolic"}
                                pixelSize={24}
                            />
                        </GtkButton>
                        <GtkButton cssClasses={["flat", "circular"]}>
                            <GtkImage iconName="media-skip-forward-symbolic" pixelSize={24} />
                        </GtkButton>
                        <GtkButton cssClasses={["flat", "circular"]}>
                            <GtkImage iconName="media-playlist-repeat-symbolic" pixelSize={20} />
                        </GtkButton>
                    </GtkBox>

                    {/* Volume Control */}
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12} halign={Gtk.Align.CENTER}>
                        <GtkImage
                            iconName={
                                volume === 0
                                    ? "audio-volume-muted-symbolic"
                                    : volume < 0.5
                                      ? "audio-volume-low-symbolic"
                                      : "audio-volume-high-symbolic"
                            }
                            pixelSize={16}
                        />
                        <GtkScale
                            orientation={Gtk.Orientation.HORIZONTAL}
                            onValueChanged={(scale: Gtk.Range) => setVolume(scale.getValue())}
                            adjustment={volumeAdjustment}
                            widthRequest={150}
                            drawValue={false}
                        />
                        <GtkLabel
                            label={`${Math.round(volume * 100)}%`}
                            cssClasses={["dim-label", "caption"]}
                            widthRequest={40}
                        />
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Implementation Notes */}
            <GtkFrame label="Implementation Notes">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={16}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkImage iconName="dialog-information-symbolic" pixelSize={24} />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
                            <GtkLabel
                                label="Using GtkVideo for Audio"
                                halign={Gtk.Align.START}
                                cssClasses={["heading"]}
                            />
                            <GtkLabel
                                label="GtkVideo can play audio files. When an audio file is loaded, only the controls are displayed without a video area."
                                wrap
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label"]}
                            />
                        </GtkBox>
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkImage iconName="emblem-system-symbolic" pixelSize={24} />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
                            <GtkLabel label="GtkMediaStream" halign={Gtk.Align.START} cssClasses={["heading"]} />
                            <GtkLabel
                                label="For advanced audio control, use GtkMediaStream directly. It provides playback control, volume adjustment, seeking, and state monitoring."
                                wrap
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label"]}
                            />
                        </GtkBox>
                    </GtkBox>

                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
                        <GtkImage iconName="applications-multimedia-symbolic" pixelSize={24} />
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={4} hexpand>
                            <GtkLabel label="GStreamer Backend" halign={Gtk.Align.START} cssClasses={["heading"]} />
                            <GtkLabel
                                label="GTK4 uses GStreamer for media playback. Supported formats depend on installed GStreamer plugins (MP3, OGG, FLAC, WAV, etc.)."
                                wrap
                                halign={Gtk.Align.START}
                                cssClasses={["dim-label"]}
                            />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>

            {/* Common Audio Icons */}
            <GtkFrame label="Audio Icons">
                <GtkBox
                    orientation={Gtk.Orientation.VERTICAL}
                    spacing={12}
                    marginTop={12}
                    marginBottom={12}
                    marginStart={12}
                    marginEnd={12}
                >
                    <GtkLabel
                        label="Common symbolic icons for audio applications"
                        halign={Gtk.Align.START}
                        cssClasses={["dim-label"]}
                    />
                    <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={24} halign={Gtk.Align.CENTER}>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkImage iconName="audio-x-generic-symbolic" pixelSize={32} />
                            <GtkLabel label="Audio" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkImage iconName="audio-volume-high-symbolic" pixelSize={32} />
                            <GtkLabel label="Volume High" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkImage iconName="audio-volume-low-symbolic" pixelSize={32} />
                            <GtkLabel label="Volume Low" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkImage iconName="audio-volume-muted-symbolic" pixelSize={32} />
                            <GtkLabel label="Muted" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                        <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={6} halign={Gtk.Align.CENTER}>
                            <GtkImage iconName="microphone-sensitivity-high-symbolic" pixelSize={32} />
                            <GtkLabel label="Microphone" cssClasses={["dim-label", "caption"]} />
                        </GtkBox>
                    </GtkBox>
                </GtkBox>
            </GtkFrame>
        </GtkBox>
    );
};

const sourceCode = `import { useMemo, useState } from "react";
import * as Gtk from "@gtkx/ffi/gtk";
import { GtkBox, GtkVideo, GtkButton, GtkScale, GtkImage } from "@gtkx/react";

const AudioDemo = () => {
  const [volume, setVolume] = useState(0.75);
  const volumeAdjustment = useMemo(() => new Gtk.Adjustment(0.75, 0, 1, 0.05, 0.1, 0), []);
  const progressAdjustment = useMemo(() => new Gtk.Adjustment(0, 0, 100, 1, 10, 0), []);

  // GtkVideo can be used for audio playback
  // When playing audio files, it shows only controls without video
  return (
    <GtkBox orientation={Gtk.Orientation.VERTICAL} spacing={12}>
      {/* Using GtkVideo for audio */}
      <GtkVideo
        file="/path/to/audio.mp3"
        autoplay={false}
      />

      {/* Custom audio player UI using standard widgets */}
      <GtkBox orientation={Gtk.Orientation.HORIZONTAL} spacing={12}>
        <GtkButton>
          <GtkImage iconName="media-playback-start-symbolic" />
        </GtkButton>
        <GtkScale
          orientation={Gtk.Orientation.HORIZONTAL}
          adjustment={progressAdjustment}
          hexpand
        />
        <GtkImage iconName="audio-volume-high-symbolic" />
        <GtkScale
          orientation={Gtk.Orientation.HORIZONTAL}
          onValueChanged={(scale: Gtk.Range) => setVolume(scale.getValue())}
          adjustment={volumeAdjustment}
          widthRequest={100}
        />
      </GtkBox>
    </GtkBox>
  );
};

// Note: For advanced audio control, use GtkMediaStream directly.
// GTK4 uses GStreamer for media playback, supporting formats like
// MP3, OGG, FLAC, WAV depending on installed plugins.`;

export const audioDemo: Demo = {
    id: "audio",
    title: "Audio",
    description: "Audio playback patterns and controls",
    keywords: ["audio", "sound", "music", "player", "media", "volume", "playback", "stream"],
    component: AudioDemo,
    sourceCode,
};
