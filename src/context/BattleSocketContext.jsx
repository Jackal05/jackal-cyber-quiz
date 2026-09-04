import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";

const BattleSocketContext = createContext(null);

export function BattleSocketProvider({ children }) {
  const { token, reloadProfile } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [onlineCount, setOnlineCount] = useState(1);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState(null);
  const [queueMode, setQueueMode] = useState("ciberseguridad");
  const [match, setMatch] = useState(null);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [rematchOffered, setRematchOffered] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const send = useCallback((type, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const connect = useCallback(() => {
    if (!token) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    setConnectionStatus("connecting");
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      send("authenticate", { token });
    };

    ws.onmessage = (event) => {
      try {
        const { type, payload } = JSON.parse(event.data);
        handleServerMessage(type, payload);
      } catch (err) {
        console.error("WS parse error:", err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus("disconnected");
      wsRef.current = null;
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connect, 2000);
    };

    ws.onerror = () => ws.close();
  }, [token, send]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  function handleServerMessage(type, payload) {
    switch (type) {
      case "authenticated":
        if (payload.onlineCount !== undefined) setOnlineCount(payload.onlineCount);
        break;
      case "queue_joined":
        setIsInQueue(true);
        setQueueMode(payload.mode || queueMode);
        setQueueStatus({ elapsedSec: 0, radius: 100, mode: payload.mode || queueMode });
        break;
      case "queue_status":
        setIsInQueue(true);
        setQueueStatus({ ...payload, mode: payload.mode || queueMode });
        if (payload.onlineCount !== undefined) setOnlineCount(payload.onlineCount);
        break;
      case "queue_cancelled":
        setIsInQueue(false);
        setQueueStatus(null);
        break;
      case "match_countdown":
        setIsInQueue(false);
        setQueueStatus(null);
        setQueueMode(payload.mode || queueMode);
        setSelectedOptionId(null);
        setHasSubmittedAnswer(false);
        setRematchOffered(null);
        setMatch({
          matchId: payload.matchId,
          state: "COUNTDOWN",
          mode: payload.mode,
          countdownSec: payload.countdownSec,
          player1: payload.player1,
          player2: payload.player2,
          scores: { [payload.player1.id]: 0, [payload.player2.id]: 0 },
        });
        break;
      case "round_start":
        setSelectedOptionId(null);
        setHasSubmittedAnswer(false);
        setMatch((prev) => prev ? {
          ...prev,
          state: "ROUND_ACTIVE",
          roundNumber: payload.roundNumber,
          totalRounds: payload.totalRounds,
          isSuddenDeath: payload.isSuddenDeath,
          startedAt: payload.startedAt,
          expiresAt: payload.expiresAt,
          durationSec: payload.durationSec,
          question: payload.question,
          scores: payload.scores,
          opponentAnswered: false,
          roundResult: null,
        } : null);
        break;
      case "opponent_answered":
        setMatch((prev) => prev ? { ...prev, opponentAnswered: true } : null);
        break;
      case "round_result":
        setMatch((prev) => prev ? {
          ...prev,
          state: "ROUND_RESULT",
          roundNumber: payload.roundNumber,
          totalRounds: payload.totalRounds,
          isSuddenDeath: payload.isSuddenDeath,
          scores: { [payload.player1.id]: payload.player1.score, [payload.player2.id]: payload.player2.score },
          roundResult: payload,
          cooldownSec: payload.cooldownSec,
        } : null);
        break;
      case "sudden_death_announced":
        setMatch((prev) => prev ? { ...prev, isSuddenDeath: true, state: "SUDDEN_DEATH", suddenDeathNotice: payload.reason } : null);
        break;
      case "match_finished":
        setMatch((prev) => prev ? { ...prev, state: payload.state, summary: payload } : null);
        reloadProfile();
        break;
      case "opponent_disconnected":
        setMatch((prev) => prev ? { ...prev, opponentDisconnected: true, gracePeriodSec: payload.gracePeriodSec } : null);
        break;
      case "opponent_reconnected":
        setMatch((prev) => prev ? { ...prev, opponentDisconnected: false } : null);
        break;
      case "rematch_offered":
        setRematchOffered(payload);
        break;
      case "rematch_expired":
        setRematchOffered(null);
        break;
      case "match_restored":
        setMatch(payload);
        if (payload?.mode) setQueueMode(payload.mode);
        break;
      default:
        break;
    }
  }

  const joinQueue = (mode = "ciberseguridad") => {
    setQueueMode(mode);
    setQueueStatus({ elapsedSec: 0, radius: 100, mode });
    setIsInQueue(true);
    send("join_queue", { mode });
  };

  const cancelQueue = () => {
    setIsInQueue(false);
    setQueueStatus(null);
    send("cancel_queue");
  };

  const submitAnswer = (optionId) => {
    if (hasSubmittedAnswer || !match || !match.question) return;
    setSelectedOptionId(optionId);
    setHasSubmittedAnswer(true);
    send("submit_answer", { matchId: match.matchId, questionId: match.question.id, selectedOptionId: optionId });
  };

  const requestRematch = () => match && send("request_rematch", { matchId: match.matchId });
  const acceptRematch = () => {
    if (!match) return;
    setRematchOffered(null);
    send("accept_rematch", { matchId: match.matchId });
  };
  const leaveMatch = () => {
    if (!match) return;
    send("leave_match", { matchId: match.matchId });
    setMatch(null);
  };
  const resetBattle = () => {
    setMatch(null);
    setIsInQueue(false);
    setQueueStatus(null);
    setSelectedOptionId(null);
    setHasSubmittedAnswer(false);
    setRematchOffered(null);
  };

  return (
    <BattleSocketContext.Provider value={{
      connectionStatus,
      onlineCount,
      isInQueue,
      queueStatus,
      queueMode,
      match,
      selectedOptionId,
      hasSubmittedAnswer,
      rematchOffered,
      joinQueue,
      cancelQueue,
      submitAnswer,
      requestRematch,
      acceptRematch,
      leaveMatch,
      resetBattle,
    }}>
      {children}
    </BattleSocketContext.Provider>
  );
}

export function useBattleSocket() {
  const context = useContext(BattleSocketContext);
  if (!context) throw new Error("useBattleSocket must be used within a BattleSocketProvider");
  return context;
}
