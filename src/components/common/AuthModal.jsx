import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { X, ShieldCheck, User, Lock, ArrowRight } from "lucide-react";

export default function AuthModal({ isOpen, onClose }) {
  const { user, login, register, updateCallsign } = useAuth();
  const [mode, setMode] = useState("callsign"); // callsign | login | register
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    let res;
    if (mode === "callsign") {
      res = await updateCallsign(username);
    } else if (mode === "login") {
      res = await login(username, password);
    } else if (mode === "register") {
      res = await register(username, password);
    }

    setIsSubmitting(false);
    if (res?.success) {
      onClose();
    } else {
      setError(res?.error || "Action failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#090d0a] p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 grid place-items-center">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {mode === "callsign" ? "Identidad Táctica" : mode === "login" ? "Iniciar Sesión" : "Crear Perfil"}
            </h2>
            <p className="text-xs text-zinc-400">
              {mode === "callsign"
                ? "Configura tu Callsign público de combate"
                : "Accede a tus estadísticas y rating guardados"}
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-zinc-800 mb-6 text-xs font-bold">
          <button
            onClick={() => { setMode("callsign"); setError(""); }}
            className={`pb-2.5 px-3 transition-colors ${mode === "callsign" ? "border-b-2 border-emerald-400 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Callsign
          </button>
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`pb-2.5 px-3 transition-colors ${mode === "login" ? "border-b-2 border-emerald-400 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`pb-2.5 px-3 transition-colors ${mode === "register" ? "border-b-2 border-emerald-400 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Callsign (Nombre de Operador)
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ej. BryanLama, 0xGhost"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                required
                maxLength={20}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">3 a 20 caracteres alfanuméricos o guión bajo.</p>
          </div>

          {mode !== "callsign" && (
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-colors"
                  required
                />
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-black font-black text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isSubmitting ? (
              "Procesando..."
            ) : mode === "callsign" ? (
              "Actualizar Callsign"
            ) : mode === "login" ? (
              "Entrar a Jackal"
            ) : (
              "Crear Perfil"
            )}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
