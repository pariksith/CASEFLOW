"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Mic, MicOff, Square } from "lucide-react";
import styles from "./story.module.css";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

export default function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [liveText, setLiveText] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionApi: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      setLiveText(interim);
      if (final) {
        onTranscript(final);
        setLiveText("");
      }
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setLiveText("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveText("");
    };

    recognitionRef.current = recognition;
  }, [onTranscript]);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    setIsRecording(true);
    setLiveText("");
    recognitionRef.current.start();
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    setLiveText("");
  };

  if (!isSupported) {
    return (
      <div className={styles.unsupported}>
        <AlertCircle className={styles.icon16} />
        <p>Voice input is not supported in this browser. Use Chrome or Edge.</p>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <div className={styles.voiceRow}>
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          className={isRecording ? styles.voiceStop : styles.voiceStart}
        >
          {isRecording ? <Square className={styles.icon16} /> : <Mic className={styles.icon16} />}
          {isRecording ? "Stop Recording" : "Start Voice Input"}
        </button>

        {isRecording && (
          <span className={styles.recordingPill}>
            <span className={styles.recordDot} />
            Recording
          </span>
        )}
      </div>

      {liveText && (
        <div className={styles.liveTranscript}>
          <p className={styles.liveTitle}>Live transcript</p>
          <p className={styles.liveText}>{liveText}</p>
        </div>
      )}

      <p className={styles.hint}>
        <MicOff className={styles.icon12} />
        English (India). Stop recording to append transcript into the story.
      </p>
    </div>
  );
}
