"use client";

import { SunIcon as Sunburst, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface FullScreenLoginProps {
  onLogin?: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}

export const FullScreenLogin = ({ onLogin, isLoading = false }: FullScreenLoginProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const validatePassword = (value: string) => {
    return value.length >= 6;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let valid = true;

    if (!validateEmail(email)) {
      setEmailError("Por favor, insira um email válido.");
      valid = false;
    } else {
      setEmailError("");
    }

    if (!validatePassword(password)) {
      setPasswordError("A senha deve ter pelo menos 6 caracteres.");
      valid = false;
    } else {
      setPasswordError("");
    }

    setSubmitted(true);

    if (valid && onLogin) {
      onLogin(e);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left Panel - Dark with light effects */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-b from-zinc-900 via-black to-zinc-900 relative overflow-hidden items-center">
        {/* Orange light bars effect */}
        <div className="absolute right-0 top-0 bottom-0 w-24 flex items-stretch">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex-1 opacity-60"
              style={{
                background: `linear-gradient(to top, 
                  transparent 0%, 
                  rgba(251, 146, 60, ${0.1 + i * 0.08}) 30%, 
                  rgba(251, 146, 60, ${0.3 + i * 0.1}) 50%,
                  rgba(251, 146, 60, ${0.1 + i * 0.08}) 70%,
                  transparent 100%
                )`,
                filter: 'blur(2px)',
              }}
            />
          ))}
        </div>

        {/* Glow effect at the edge */}
        <div 
          className="absolute right-0 top-0 bottom-0 w-32"
          style={{
            background: 'linear-gradient(to left, rgba(251, 146, 60, 0.15), transparent)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-12 xl:p-16">
          <p className="text-3xl xl:text-4xl font-light text-white leading-snug max-w-sm">
            Sistema de gestão e auditorias 5S para empresas.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <Sunburst className="w-10 h-10 text-orange-500" strokeWidth={1.5} />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 mb-2">
              Entrar
            </h1>
            <p className="text-zinc-500 text-sm">
              Bem-vindo ao 5S Manager — Faça login para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-zinc-700">
                Seu email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                className={`text-sm w-full py-2.5 px-3 border rounded-lg focus:outline-none focus:ring-1 bg-white text-zinc-900 placeholder:text-zinc-400 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                  emailError ? "border-red-500" : "border-zinc-300"
                }`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
                aria-describedby="email-error"
                disabled={isLoading}
              />
              {emailError && (
                <p id="email-error" className="text-red-500 text-xs">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                Sua senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`text-sm w-full py-2.5 px-3 pr-10 border rounded-lg focus:outline-none focus:ring-1 bg-white text-zinc-900 placeholder:text-zinc-400 focus:ring-orange-500 focus:border-orange-500 transition-all ${
                    passwordError ? "border-red-500" : "border-zinc-300"
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!passwordError}
                  aria-describedby="password-error"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-2.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="text-red-500 text-xs">
                  {passwordError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          {/* Footer link */}
          <p className="text-center text-sm text-zinc-500 mt-6">
            Problemas para acessar?{" "}
            <span className="text-zinc-900 underline underline-offset-2 cursor-pointer hover:text-orange-500 transition-colors">
              Contato
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
