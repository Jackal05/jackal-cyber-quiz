import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { BattleSocketProvider } from "./context/BattleSocketContext.jsx";
import Navbar from "./components/layout/Navbar.jsx";
import Footer from "./components/layout/Footer.jsx";
import AuthModal from "./components/common/AuthModal.jsx";

import DashboardView from "./views/DashboardView.jsx";
import BattleView from "./views/BattleView.jsx";
import TrainingSection from "./components/training/TrainingSection.jsx";
import LeaderboardView from "./components/leaderboard/LeaderboardView.jsx";
import BattleHistoryView from "./components/history/BattleHistoryView.jsx";
import ProfileView from "./components/profile/ProfileView.jsx";

function AppContent() {
  const { showAuthModal, setShowAuthModal } = useAuth();

  const getRouteFromHash = () => {
    const hash = window.location.hash.replace("#/", "").replace("#", "").toLowerCase();
    if (["dashboard", "training", "battle", "leaderboard", "history", "profile"].includes(hash)) {
      return hash;
    }
    return "dashboard";
  };

  const [currentRoute, setCurrentRoute] = useState(getRouteFromHash);
  const [trainingCategory, setTrainingCategory] = useState("ciberseguridad");

  useEffect(() => {
    const handleHashChange = () => setCurrentRoute(getRouteFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (route) => {
    window.location.hash = `#/${route}`;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePracticeTopic = (categorySlug) => {
    setTrainingCategory(categorySlug || "ciberseguridad");
    navigateTo("training");
  };

  return (
    <div className="min-h-screen text-zinc-100 selection:bg-emerald-300 selection:text-black flex flex-col justify-between relative isolate">
      <div className="fixed inset-x-0 top-0 h-[26rem] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute left-[7%] top-[-10rem] h-[24rem] w-[24rem] rounded-full bg-emerald-400/[.075] blur-[110px]" />
        <div className="absolute right-[6%] top-[-8rem] h-[22rem] w-[22rem] rounded-full bg-sky-400/[.045] blur-[120px]" />
      </div>

      <Navbar
        currentRoute={currentRoute}
        onRouteChange={navigateTo}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      <main className="relative z-10 flex-1 px-4 sm:px-6 py-7 md:py-10">
        {currentRoute === "dashboard" && (
          <DashboardView onNavigate={navigateTo} onPracticeTopic={handlePracticeTopic} />
        )}

        {currentRoute === "battle" && (
          <BattleView
            onViewHistory={() => navigateTo("history")}
            onViewLeaderboard={() => navigateTo("leaderboard")}
            onPracticeTopic={handlePracticeTopic}
          />
        )}

        {currentRoute === "training" && (
          <TrainingSection initialCategory={trainingCategory} onNavigate={navigateTo} />
        )}

        {currentRoute === "leaderboard" && <LeaderboardView />}

        {currentRoute === "history" && (
          <BattleHistoryView onFindBattle={() => navigateTo("battle")} />
        )}

        {currentRoute === "profile" && (
          <ProfileView onOpenAuthModal={() => setShowAuthModal(true)} />
        )}
      </main>

      <Footer onNavigate={navigateTo} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BattleSocketProvider>
        <AppContent />
      </BattleSocketProvider>
    </AuthProvider>
  );
}
