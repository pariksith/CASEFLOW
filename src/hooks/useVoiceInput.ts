"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface UseVoiceInputReturn {
  isRecording: boolean;
  isSupported: boolean;
  liveTranscript: string;
  startRecording: () => void;
  stopRecording: () => void;
  error: string | null;
}

export function useVoiceInput(
  onFinalTranscript: (text: string) => void
): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognitionApi: SpeechRecognitionConstructor | undefined =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognitionApi();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      setLiveTranscript(interim);

      if (finalText.trim()) {
        onFinalTranscript(finalText.trim());
        setLiveTranscript("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setError(`Voice error: ${event.error}`);
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognition.onend = () => {
      setIsRecording(false);
      setLiveTranscript("");
    };

    recognitionRef.current = recognition;
  }, [onFinalTranscript]);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    setError(null);
    setLiveTranscript("");
    setIsRecording(true);
    try {
      recognitionRef.current.start();
    } catch {
      setError("Could not start recording");
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsRecording(false);
    setLiveTranscript("");
  }, []);

  return {
    isRecording,
    isSupported,
    liveTranscript,
    startRecording,
    stopRecording,
    error,
  };
}
