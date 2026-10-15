"use client";

import React, { useState, useEffect, useRef } from "react";
import { Flame, Send, ShieldAlert, CheckCircle2, Volume2 } from "lucide-react";

interface Message {
  id: string;
  sender: "A" | "B";
  speakerName: string;
  originalText: string;
  translatedText: string;
  interrupted?: boolean;
  conceded?: boolean;
  timestamp: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

export default function HeatedArgumentApp() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      sender: "A",
      speakerName: "Speaker A (Hindi)",
      originalText: "तुम कभी भी डेडलाइन का ध्यान नहीं रखते, हमेशा सब कुछ आखिरी दिन पर छोड़ देते हो!",
      translatedText: "¡Nunca prestas atención a los plazos, siempre lo dejas todo para el último día!",
      timestamp: "10:14 AM",
    },
    {
      id: "init-2",
      sender: "B",
      speakerName: "Speaker B (Spanish)",
      originalText: "¡Eso es falso! Estuve esperando tus especificaciones durante tres días enteros y nunca las enviaste.",
      translatedText: "यह बिल्कुल गलत है! मैं पूरे तीन दिन से आपके स्पेसिफिकेशन्स का इंतज़ार कर रहा था और आपने कभी भेजे ही नहीं।",
      timestamp: "10:15 AM",
    },
  ]);

  // Current active typing state
  const [activeSpeaker, setActiveSpeaker] = useState<"A" | "B" | null>(null);
  const [draftA, setDraftA] = useState("");
  const [draftB, setDraftB] = useState("");

  // Heat Level: 0 (peace) to 100 (raging argument)
  const [heatLevel, setHeatLevel] = useState(45);

const [isListening, setIsListening] = useState<"A" | "B" | null>(null);

  const startListening = (speaker: "A" | "B") => {
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    if (isListening) {
      setIsListening(null);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    // Set speech recognition language based on speaker
    recognition.lang = speaker === "A" ? "hi-IN" : "es-ES";

    recognition.onstart = () => {
      setIsListening(speaker);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Auto-fills the message text or sends it
      if (speaker === "A") {
        setDraftA(transcript);
      } else {
        setDraftB(transcript);
      }
      setActiveSpeaker(speaker);
      setIsListening(null);
    };

    recognition.onerror = () => {
      setIsListening(null);
    };

    recognition.onend = () => {
      setIsListening(null);
    };

    recognition.start();
  };

  // Stance / Mind Change tracking
  const [concededA, setConcededA] = useState(false);
  const [concededB, setConcededB] = useState(false);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, draftA, draftB]);

  // Real-time quick translation simulator (Hindi <-> Spanish)
  const quickTranslate = (text: string, targetLang: string) => {
    if (!text.trim()) return "";
    if (targetLang === "es") {
      return "[Traduccion en vivo]: " + text;
    } else {
      return "[Live Translation]: " + text;
    }
  };

  // Calculate heat surge based on caps, exclamation marks, or rapid typing
  const calculateHeatBump = (text: string) => {
    let bump = 8;
    if (text.includes("!") || text.includes("?")) bump += 10;
    if (text === text.toUpperCase() && text.length > 5) bump += 15;
    return bump;
  };

  // BARGE-IN / INTERRUPTION HANDLER
  // If Speaker B starts typing while Speaker A is active, Speaker A's stream gets cut off immediately.
  const handleBargeIn = (interrupter: "A" | "B") => {
    if (synthRef.current?.speaking) {
      synthRef.current.cancel(); // Mutes any running audio immediately
    }

    if (activeSpeaker && activeSpeaker !== interrupter) {
      const ongoingText = activeSpeaker === "A" ? draftA : draftB;

      if (ongoingText.trim().length > 0) {
        // Cut off and commit the victim's partial sentence
        const cutOffMessage: Message = {
          id: Date.now().toString(),
          sender: activeSpeaker,
          speakerName: activeSpeaker === "A" ? "Speaker A (Hindi)" : "Speaker B (Spanish)",
          originalText: ongoingText,
          translatedText: "[Cut off mid-sentence: " + ongoingText.slice(0, 25) + "...]",
          interrupted: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, cutOffMessage]);
      }

      // Wipe previous speaker's ongoing stream
      if (activeSpeaker === "A") setDraftA("");
      if (activeSpeaker === "B") setDraftB("");

      // Argument heat jumps sharply when someone interrupts
      setHeatLevel((prev) => Math.min(100, prev + 22));
    }

    setActiveSpeaker(interrupter);
  };

  // Commit message
  const handleSend = (sender: "A" | "B", text: string) => {
    if (!text.trim()) return;

    const targetLang = sender === "A" ? "es" : "hi";
    const translated = quickTranslate(text, targetLang);

    // Audio TTS playback (optional preview)
    if (synthRef.current) {
      const cleanText = text.replace(/[!?.#]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = sender === "A" ? "hi-IN" : "es-ES";
      synthRef.current.speak(utterance);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      speakerName: sender === "A" ? "Speaker A (Hindi)" : "Speaker B (Spanish)",
      originalText: text,
      translatedText: translated,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMessage]);

    if (sender === "A") setDraftA("");
    if (sender === "B") setDraftB("");
    setActiveSpeaker(null);

    // Slowly decays heat if no interruptions happen
    setHeatLevel((prev) => Math.max(20, prev - 5));
  };

  // MIND CHANGE / CONCESSION HANDLER
  const handleConcede = (speaker: "A" | "B") => {
    if (speaker === "A") setConcededA(true);
    if (speaker === "B") setConcededB(true);

    const concessionText =
      speaker === "A"
        ? "ठीक है, मैं अपनी बात वापस लेता हूँ। तुम सही थे, मुझे पहले चेक करना चाहिए था।"
        : "Está bien, lo admito. Tienes razón en este punto, me equivoqué.";

    const translatedConcession =
      speaker === "A"
        ? "[Concesión]: De acuerdo, retiro lo dicho. Tenías razón, debí haber revisado primero."
        : "[स्वीकृति]: ठीक है, मैं मानता हूँ। इस बात पर आप सही हैं, मुझसे गलती हुई।";

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: speaker,
        speakerName: speaker === "A" ? "Speaker A (Hindi)" : "Speaker B (Spanish)",
        originalText: concessionText,
        translatedText: translatedConcession,
        conceded: true,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);

    // Argument visibly cools down
    setHeatLevel((prev) => Math.max(10, prev - 40));
  };

  return (
    <div
      className={`min-h-screen bg-black text-neutral-100 flex flex-col font-sans transition-colors duration-500 border-t-8 ${
        heatLevel > 70 ? "border-red-600" : heatLevel > 40 ? "border-amber-500" : "border-emerald-500"
      }`}
    >
      {/* Top Bar: Room Title & Live Heat Meter */}
      <header className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-wider uppercase text-white">DebateRoom</h1>
            <span className="text-[11px] bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded font-mono">
              Live Interruption Engine
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Speaker A (Hindi) vs. Speaker B (Spanish) — Real-time translation, Barge-in cuts, and Stance detector
          </p>
        </div>

        {/* Heat Gauge */}
        <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-xl">
          <div className="flex items-center gap-1.5">
            <Flame
              className={`w-5 h-5 transition-all ${
                heatLevel > 65 ? "text-red-500 animate-pulse scale-125" : "text-amber-400"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              {heatLevel > 70 ? "Heated Debate" : heatLevel > 40 ? "Intense Dispute" : "Cooling Down"}
            </span>
          </div>

          <div className="w-28 h-2.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                heatLevel > 70 ? "bg-red-500" : heatLevel > 40 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: heatLevel + "%" }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">{heatLevel}%</span>
        </div>
      </header>

      {/* Main Argument Feed */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-4xl mx-auto w-full space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={msg.sender === "A" ? "flex flex-col items-start" : "flex flex-col items-end"}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-neutral-400">{msg.speakerName}</span>
              <span className="text-[10px] text-neutral-600">{msg.timestamp}</span>

              {msg.interrupted && (
                <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-black tracking-wide flex items-center gap-1 animate-pulse">
                  <ShieldAlert className="w-3 h-3" /> INTERRUPTED
                </span>
              )}

              {msg.conceded && (
                <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> CONCEDED / CHANGED MIND
                </span>
              )}
            </div>

            <div
              className={`p-4 rounded-2xl max-w-lg transition-all ${
                msg.interrupted
                  ? "bg-red-950/30 border border-red-800/60 line-through text-neutral-300 opacity-80"
                  : msg.conceded
                  ? "bg-emerald-950/30 border border-emerald-800/80 text-emerald-100"
                  : msg.sender === "A"
                  ? "bg-neutral-900 border border-neutral-800 text-neutral-100"
                  : "bg-blue-950/30 border border-blue-900/60 text-neutral-100"
              }`}
            >
              <p className="text-sm font-medium leading-relaxed">{msg.originalText}</p>
              <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-start gap-1.5 text-xs text-neutral-400 font-mono">
                <Volume2 className="w-3.5 h-3.5 text-neutral-500 mt-0.5 shrink-0" />
                <span>{msg.translatedText}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Live Active Stream (Shows words appearing as typed/spoken before sending) */}
        {activeSpeaker === "A" && draftA && (
          <div className="flex flex-col items-start w-full animate-fade-in">
            <span className="text-[11px] text-red-400 font-bold mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Speaker A is cutting in...
            </span>
            <div className="p-3.5 rounded-2xl max-w-lg bg-neutral-900 border border-red-600/70 text-sm">
              <p className="text-neutral-200">{draftA}</p>
              <p className="text-xs text-neutral-500 mt-1.5 font-mono">{quickTranslate(draftA, "es")}</p>
            </div>
          </div>
        )}

        {activeSpeaker === "B" && draftB && (
          <div className="flex flex-col items-end w-full animate-fade-in">
            <span className="text-[11px] text-red-400 font-bold mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" /> Speaker B is cutting in...
            </span>
            <div className="p-3.5 rounded-2xl max-w-lg bg-neutral-900 border border-red-600/70 text-sm">
              <p className="text-neutral-200">{draftB}</p>
              <p className="text-xs text-neutral-500 mt-1.5 font-mono">{quickTranslate(draftB, "hi")}</p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      {/* Two-Sided Argument Cockpit */}
      <footer className="border-t border-neutral-800 bg-neutral-950 p-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Side A: Speaker 1 (Hindi) */}
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-neutral-300">Speaker A (Hindi)</span>
              <button
                type="button"
                onClick={() => handleConcede("A")}
                disabled={concededA}
                className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                {concededA ? "Conceded ✓" : "Change Mind"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startListening("A")}
                className={
                  isListening === "A"
                    ? "p-2 rounded-full bg-red-600 text-white animate-pulse"
                    : "p-2 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }
                title="Speak in Hindi"
              >
                🎙️ {isListening === "A" ? "Listening..." : "Mic (Hindi)"}
              </button>
              <input
                type="text"
                placeholder="अपनी बात कहें या बीच में काटें..."
                value={draftA}
                onFocus={() => handleBargeIn("A")}
                onChange={(e) => {
                  setDraftA(e.target.value);
                  handleBargeIn("A");
                  setHeatLevel((prev) => Math.min(100, prev + calculateHeatBump(e.target.value) * 0.1));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend("A", draftA);
                }}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => handleBargeIn("A")}
                className="px-2.5 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-200 font-bold text-xs"
                title="Force interruption"
              >
                Interrupt
              </button>
              <button
                type="button"
                onClick={() => handleSend("A", draftA)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Side B: Speaker 2 (Spanish) */}
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-neutral-300">Speaker B (Spanish)</span>
              <button
                type="button"
                onClick={() => handleConcede("B")}
                disabled={concededB}
                className="text-[11px] px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
              >
                {concededB ? "Conceded ✓" : "Change Mind"}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startListening("B")}
                className={
                  isListening === "B"
                    ? "p-2 rounded-full bg-red-600 text-white animate-pulse"
                    : "p-2 rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                }
                title="Speak in Spanish"
              >
                🎙️ {isListening === "B" ? "Listening..." : "Mic (Spanish)"}
              </button>
              <input
                type="text"
                placeholder="Habla o interrumpe aquí..."
                value={draftB}
                onFocus={() => handleBargeIn("B")}
                onChange={(e) => {
                  setDraftB(e.target.value);
                  handleBargeIn("B");
                  setHeatLevel((prev) => Math.min(100, prev + calculateHeatBump(e.target.value) * 0.1));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend("B", draftB);
                }}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="button"
                onClick={() => handleBargeIn("B")}
                className="px-2.5 py-1 rounded-lg bg-red-900/80 hover:bg-red-800 text-red-200 font-bold text-xs"
                title="Force interruption"
              >
                Interrupt
              </button>
              <button
                type="button"
                onClick={() => handleSend("B", draftB)}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}