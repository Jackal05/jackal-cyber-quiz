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

  // URL Hash Sync for clean SPA navigation
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
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash());
    };
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
    <div className="min-h-screen bg-[#050806] text-zinc-100 selection:bg-emerald-400 selection:text-black flex flex-col justify-between">
      {/* Background Matrix/Grid Aesthetic */}
      <div
        className="fixed inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,197,94,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(34,197,94,.03) 1px,transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 h-80 w-3/4 bg-emerald-500/[0.07] blur-[140px] pointer-events-none" />

      {/* Navigation */}
      <Navbar
        currentRoute={currentRoute}
        onRouteChange={navigateTo}
        onOpenAuthModal={() => setShowAuthModal(true)}
      />

      {/* Main View Container */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 py-8 md:py-12">
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

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Auth / Identity Modal */}
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
