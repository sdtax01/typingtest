import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const auth = useAuth();
  const nav = useNavigate();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth.configured) return <div className="card p-6">खाते (Supabase) कॉन्फिगर केलेले नाही. अ‍ॅप Local mode मध्ये आहे — लॉगिनशिवाय वापरा.</div>;
  if (auth.session) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const err = signup ? await auth.signUp(email, password, name) : await auth.signIn(email, password);
    setBusy(false);
    if (err) setMsg(err);
    else if (signup) setMsg('खाते तयार झाले. आवश्यक असल्यास ई-मेल पुष्टी करा, नंतर लॉगिन करा.');
    else nav('/');
  };

  return (
    <form onSubmit={submit} className="card p-6 max-w-md mx-auto space-y-4" aria-labelledby="login-h">
      <h1 id="login-h" className="text-xl font-bold">{signup ? 'नवीन खाते' : 'लॉगिन'}</h1>
      {signup && <div><label className="label" htmlFor="n">नाव</label><input id="n" className="input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} /></div>}
      <div><label className="label" htmlFor="e">ई-मेल</label><input id="e" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><label className="label" htmlFor="p">पासवर्ड</label><input id="p" type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      {msg && <p role="alert" className="text-sm text-bad-600">{msg}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'थांबा…' : signup ? 'खाते तयार करा' : 'लॉगिन'}</button>
      <button type="button" className="text-sm underline" onClick={() => { setSignup(!signup); setMsg(null); }}>{signup ? 'आधीच खाते आहे? लॉगिन' : 'नवीन खाते तयार करा'}</button>
      <p className="text-xs text-ink-500">लॉगिन ऐच्छिक आहे. लॉगिनशिवायही सराव करता येतो.</p>
    </form>
  );
}
