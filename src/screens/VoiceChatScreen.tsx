import { useEffect, useRef, useState } from "react";
import "../styles/voice-chat.css";
import { useChatScroll } from "../hooks/useChatScroll";
import { useSpeechToText } from "../hooks/useSpeechToText";
import type { AssistantTextMsg, Msg } from "../types";
import type { useChatEngine } from "../hooks/useChatEngine";
import { ProductsStripVoice } from "../components/ProductsStrip/ProductsStripVoice"; // 👈 pridėta

type VoiceChatScreenProps = {
  chat: ReturnType<typeof useChatEngine>; // 👈 gaunam chat iš App.tsx
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
  chat,
  onKeyboard,
  autoStart,
  initialQuestion = "Hello, what are you looking for today?",
}: VoiceChatScreenProps) {
  const logRef = useRef<HTMLDivElement>(null);
  useChatScroll(logRef, chat.messages);

  // user bubble iš voice → chat log
  const { mode, finalText, interimText, toggleListening } = useSpeechToText((msg) => {
    console.log("👤 Adding user message:", msg);
    chat.addMessage(msg);
  });

  const [stepIndex, setStepIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(initialQuestion);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNoInput, setShowNoInput] = useState(false);
  const [hadListening, setHadListening] = useState(false);
  const [, setHasSubmitted] = useState(false);

  // --- Resume logika (tik mount metu) ---
  useEffect(() => {
    const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.kind === "text");
    if (lastAssistant) {
      console.log("↩️ Resume with last AI question:", lastAssistant.text);
      setCurrentQuestion(lastAssistant.text);
      setHasSubmitted(true);

      const idx = VOICE_QUESTIONS.findIndex((q) => q === lastAssistant.text);
      if (idx >= 0) {
        setStepIndex(idx + 1);
        console.log("🔢 Resuming stepIndex at:", idx + 1);
      }
    } else {
      console.log("🆕 Starting fresh with initial question");
      setCurrentQuestion(initialQuestion);
      setStepIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto start mic
  useEffect(() => {
    if (autoStart) {
      const t = setTimeout(() => {
        toggleListening();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [autoStart]);

  // Handle finalText → AI klausimai
  useEffect(() => {
    if (!finalText) return;
    console.log("🎤 Final text captured:", finalText);

    setShowNoInput(false);
    if (finalText.trim().length === 0) return;

    setHasSubmitted(true);

    if (stepIndex < VOICE_QUESTIONS.length) {
      setIsGenerating(true);

      const timeout = setTimeout(() => {
        const aiQ = VOICE_QUESTIONS[stepIndex];
        const aiMsg: Msg = {
          id: crypto.randomUUID?.() ?? `ai-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: aiQ,
        };
        console.log("🤖 Adding AI question:", aiMsg);
        chat.addMessage(aiMsg);

        setCurrentQuestion(aiQ);
        setStepIndex((s) => s + 1);
        setIsGenerating(false);
      }, 2000);

      return () => clearTimeout(timeout);
    } else {
      setIsGenerating(true);

      const processingMsg: AssistantTextMsg = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        kind: "text",
        text: "Processing your request…",
      };
      console.log("🤖 Adding AI processing msg:", processingMsg);
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
      {!showNoInput && mode === "listening" && !isGenerating && (
        <div className="vc-header">
          <div className="vc-header-line" />
          <h2 className="vc-question">{currentQuestion}</h2>
        </div>
      )}

      <div className="vc-body" ref={logRef}>
        {!showNoInput ? (
          <>
            {(() => {
              const lastMsg = [...chat.messages].reverse().find((m) => m.role === "assistant" || m.role === "user");

              if (!lastMsg) return null;

              // 🟦 Produktai – horizontal strip
              if (lastMsg.kind === "products") {
                return (
                  <ProductsStripVoice
                    key={lastMsg.id}
                    products={lastMsg.products}
                    header={lastMsg.header}
                    footer={lastMsg.footer}
                    visibleCount={lastMsg.visibleCount}
                    showMore={lastMsg.showMore}
                    onAddToCart={chat.handleChangeCart}
                    className="products-voice"
                  />
                );
              }

              // 🟦 AI klausimas
              if (lastMsg.role === "assistant" && lastMsg.kind === "text") {
                // ❌ Jei voice on (listening/generating), nerodom body
                if (mode === "listening" || isGenerating) return null;

                // ✅ Rodyti tik kai voice off
                return (
                  <>
                    <p className="vc-instruction">Answer the question or input any information you wish</p>
                    <div className="vc-answer vc-answer--ai">{lastMsg.text}</div>
                  </>
                );
              }

              // 🟦 User atsakymas
              if (lastMsg.role === "user" && lastMsg.kind === "text") {
                // ❌ Jei generuojam – nerodom
                if (isGenerating || mode === "listening") return null;

                return <div className="vc-answer vc-answer--user">{lastMsg.text}</div>;
              }
              return null;
            })()}

            {/* Interim klausymo metu */}
            {mode === "listening" && interimText && <div className="vc-answer vc-answer--user">{interimText}</div>}

            {/* Generating state */}
            {isGenerating && (
              <div className="vc-generating">
                <img src="/img/generating-answer.svg" alt="Generating" />
                <p>GENERATING ANSWER…</p>
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

      {/* 🟦 Mic rodom tik jei NE produktai ir NE generating */}
      {!isGenerating && !chat.messages.some((m) => m.kind === "products") && (
        <div className="vc-mic-wrap">
          <button className={`vc-mic ${mode === "listening" ? "is-listening" : ""}`} onClick={toggleListening}>
            <img src="/img/voice-sphere.svg" alt="Mic" />
            {mode === "listening" && <div className="vc-ripples"></div>}
          </button>
          {mode === "listening" && <span className="vc-status">LISTENING...</span>}
        </div>
      )}
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
