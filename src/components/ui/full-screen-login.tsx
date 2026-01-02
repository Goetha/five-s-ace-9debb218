"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";

interface FullScreenLoginProps {
  onLogin?: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}

export const FullScreenLogin = ({ onLogin, isLoading = false }: FullScreenLoginProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">5S Manager</h1>
          <p className="text-zinc-500 text-sm mt-1">Faça login para continuar</p>
        </div>

        <form onSubmit={onLogin} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="seu@email.com"
              disabled={isLoading}
              className="w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">Senha</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-3 py-2.5 pr-10 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
