import React from "react";
import { useBattleSocket } from "../context/BattleSocketContext.jsx";
import BattleLobby from "../components/battle/BattleLobby.jsx";
import MatchmakingScreen from "../components/battle/MatchmakingScreen.jsx";
import VsScreen from "../components/battle/VsScreen.jsx";
import BattleArena from "../components/battle/BattleArena.jsx";
import RoundResultScreen from "../components/battle/RoundResultScreen.jsx";
import MatchSummaryScreen from "../components/battle/MatchSummaryScreen.jsx";
import RematchModal from "../components/battle/RematchModal.jsx";

export default function BattleView({ onViewHistory, onViewLeaderboard, onPracticeTopic }) {
  const {
    isInQueue,
    match,
    joinQueue,
    cancelQueue,
    requestRematch,
    acceptRematch,
    leaveMatch,
    resetBattle,
    rematchOffered,
  } = useBattleSocket();

  if (isInQueue) {
    return <MatchmakingScreen onCancel={cancelQueue} />;
  }

  if (match) {
    return (
      <div className="relative">
        {match.state === "COUNTDOWN" && <VsScreen match={match} />}
        {match.state === "ROUND_ACTIVE" && <BattleArena />}
        {match.state === "ROUND_RESULT" && <RoundResultScreen match={match} />}

        {(match.state === "MATCH_FINISHED" || match.state === "FORFEIT") && (
          <MatchSummaryScreen
            match={match}
            onRematch={requestRematch}
            onFindNewOpponent={() => {
              const previousMode = match.mode || "ciberseguridad";
              resetBattle();
              joinQueue(previousMode);
            }}
            onBackToLobby={resetBattle}
            onPracticeTopic={onPracticeTopic}
          />
        )}

        {rematchOffered && (
          <RematchModal
            rematchOffered={rematchOffered}
            onAccept={acceptRematch}
            onDecline={() => leaveMatch()}
          />
        )}
      </div>
    );
  }

  return (
    <BattleLobby
      onFindOpponent={(mode) => joinQueue(mode)}
      onViewHistory={onViewHistory}
      onViewLeaderboard={onViewLeaderboard}
    />
  );
}
