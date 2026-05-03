import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/Button";
import { Mail, Lock, User, Zap, AlertCircle } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../contexts/AuthContext";

const MBTI_TYPES = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];

const Field = ({ label, type = "text", placeholder, value, onChange, icon, autoComplete }: any) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block">{label}</label>
    <div className="relative">
      {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">{icon}</span>}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
        className={`w-full ${icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm transition-colors`}
      />
    </div>
  </div>
);

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-center">
      <div className="text-center mb-8">
        <div className="md:hidden w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <Logo className="w-full h-full" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Welcome back</h2>
        <p className="text-zinc-500">Enter your details to access your account.</p>
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <form className="space-y-4" onSubmit={handleSubmit} autoComplete="off">
        <Field label="Email" type="email" placeholder="your@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} icon={<Mail className="w-4 h-4" />} autoComplete="off" />
        <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={(e: any) => setPassword(e.target.value)} icon={<Lock className="w-4 h-4" />} autoComplete="new-password" />
        <Button className="w-full mt-2" type="submit" size="lg" disabled={loading}>
          {loading ? "Signing in…" : "Log In"}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm text-zinc-500">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Sign up</Link>
      </div>
    </div>
  );
};

export const Signup = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", username: "", email: "", password: "", mbti: "INFP" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col justify-center">
      <div className="text-center mb-8">
        <div className="md:hidden w-16 h-16 mx-auto flex items-center justify-center mb-4">
          <Logo className="w-full h-full" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Create an account</h2>
        <p className="text-zinc-500">Join the Aura community today.</p>
      </div>
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      <form className="space-y-3" onSubmit={handleSubmit} autoComplete="off">
        <Field label="Full Name" placeholder="Jane Doe" value={form.fullName} onChange={set("fullName")} icon={<User className="w-4 h-4" />} autoComplete="name" />
        <Field label="Username" placeholder="janedoe" value={form.username} onChange={set("username")} autoComplete="username" />
        <Field label="Email Address" type="email" placeholder="you@university.edu" value={form.email} onChange={set("email")} icon={<Mail className="w-4 h-4" />} autoComplete="email" />
        <Field label="Password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set("password")} icon={<Lock className="w-4 h-4" />} autoComplete="new-password" />
        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> MBTI Type
          </label>
          <select
            value={form.mbti}
            onChange={set("mbti")}
            className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm transition-colors"
          >
            {MBTI_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <Button className="w-full mt-2" type="submit" size="lg" disabled={loading}>
          {loading ? "Creating…" : "Create Account"}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">Log in</Link>
      </div>
    </div>
  );
};
