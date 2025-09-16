import { useEffect, useRef, useState } from "react";
import "../styles/voice-chat.css";
import { useChatEngine } from "../hooks/useChatEngine";
import { useChatScroll } from "../hooks/useChatScroll";
import { useSpeechToText } from "../hooks/useSpeechToText";
import type { AssistantTextMsg } from "../types";

type VoiceChatScreenProps = {
  onKeyboard: () => void;
  onBack?: () => void;
  autoStart?: boolean;
  initialQuestion?: string;
};

const VOICE_QUESTIONS = [
  "Question nr.1: Do you prefer vegan friendly options or have some specific needs to help us find you the best product?",
  "Question nr.2: Do you have any alergies or any medical problems?",
  "Question nr.3: Do you prefer shopping online or do you prefer going to the store?",
];

export default function VoiceChatScreen({
  onKeyboard,
  autoStart,
  initialQuestion = "Hello, what are you looking for today?",
}: VoiceChatScreenProps) {
  const chat = useChatEngine();
  const logRef = useRef<HTMLDivElement>(null);
  useChatScroll(logRef, chat.messages);

  const { mode, finalText, interimText, toggleListening } = useSpeechToText();

  const [stepIndex, setStepIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNoInput, setShowNoInput] = useState(false);
  const [hadListening, setHadListening] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Auto start mic
  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => {
        toggleListening();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  // Handle finalText → pereinam prie kito klausimo
  useEffect(() => {
    if (!finalText) return;

    setShowNoInput(false);
    if (finalText.trim().length === 0) return;

    setHasSubmitted(true);

    // USER atsakymas → chat log
    chat.sendMessage(finalText, { source: "voice" });

    if (stepIndex < VOICE_QUESTIONS.length) {
      setIsGenerating(true);

      const timeout = setTimeout(() => {
        const aiQ = VOICE_QUESTIONS[stepIndex];

        // USER atsakymas → chat log
        chat.addMessage({
          id: crypto.randomUUID?.() ?? `user-${Date.now()}`,
          role: "user",
          kind: "text",
          text: finalText,
        });

        // AI klausimas → chat log
        chat.addMessage({
          id: crypto.randomUUID?.() ?? `ai-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: aiQ,
        });

        setCurrentQuestion(aiQ);
        setStepIndex((s) => s + 1);
        setIsGenerating(false);
      }, 2000);

      return () => clearTimeout(timeout);
    } else {
      setIsGenerating(true);

      // 👇 paskutinis user input jau buvo nusiųstas su source:voice
      const processingMsg: AssistantTextMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        kind: "text",
        text: "Processing your request…",
      };

      chat.addMessage(processingMsg);
      setCurrentQuestion(processingMsg.text);
      setStepIndex(0);

      const timeout = setTimeout(() => {
        setIsGenerating(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [finalText]);

  // Track mic state
  useEffect(() => {
    if (mode === "listening") {
      setHadListening(true);
      setShowNoInput(false);
    }
    if (mode === "idle" && hadListening && !finalText && !interimText) {
      setShowNoInput(true);
      setHadListening(false);
    }
  }, [mode, finalText, interimText, hadListening]);

  return (
    <div className={`voice-chat-screen ${mode === "listening" ? "listening" : ""}`}>
      {/* HEADER: tik kai klausom */}
      {!showNoInput && mode === "listening" && !isGenerating && (
        <div className="vc-header">
          <div className="vc-header-line" />
          <h2 className="vc-question">{currentQuestion}</h2>
        </div>
      )}

      {/* BODY */}
      <div className="vc-body" ref={logRef}>
        {!showNoInput ? (
          <>
            {/* Instrukcija + klausimas kaip AI atsakymas */}
            {hasSubmitted && !isGenerating && mode !== "listening" && (
              <>
                <p className="vc-instruction">Answer the question or input any information you wish</p>
                <div className="vc-answer vc-answer--ai">{currentQuestion}</div>
              </>
            )}

            {/* Interim klausymo metu */}
            {mode === "listening" && interimText && <div className="vc-answer vc-answer--user">{interimText}</div>}

            {/* Generating */}
            {isGenerating && (
              <div className="vc-generating">
                <img src="/img/generating-answer.svg" alt="Generating" />
                <p>Generating answer…</p>
              </div>
            )}
          </>
        ) : (
          <div className="vc-noinput-overlay">
            <p className="vc-noinput-title">Couldn’t hear you! Can you repeat?</p>
            <p className="vc-noinput-sub">Tap to type · Hold to speak</p>
          </div>
        )}
      </div>

      {/* MIC */}
      {!isGenerating && (
        <div className="vc-mic-wrap">
          <button className={`vc-mic ${mode === "listening" ? "is-listening" : ""}`} onClick={toggleListening}>
            <img src="/img/voice-sphere.svg" alt="Mic" />
            {mode === "listening" && <div className="vc-ripples"></div>}
          </button>
          {mode === "listening" && <span className="vc-status">LISTENING...</span>}
        </div>
      )}

      {/* FOOTER */}
      <div className="vc-footer">
        <button className="footer-btn left">
          <img src="/img/speaker.svg" alt="Speaker" />
        </button>
        <button className="footer-btn right" onClick={onKeyboard}>
          <img src="/img/keyboard.svg" alt="Keyboard" />
        </button>
      </div>
    </div>
  );
}
