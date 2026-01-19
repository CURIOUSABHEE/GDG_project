import React, { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:5001/api';

export default function Auth() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState(''); // New state
    const [error, setError] = useState('');
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        setLoading(true);
        setError('');
        try {
            // Password Registration
            if (password) {
                const resp = await fetch(`${API_BASE}/auth/register/password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await resp.json();
                if (resp.ok) {
                    login(data.token, data.username);
                } else {
                    setError(data.error || 'Registration failed');
                }
                return;
            }

            // Passkey Registration
            const resp = await fetch(`${API_BASE}/auth/register/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const options = await resp.json();

            let attResp;
            try {
                attResp = await startRegistration(options);
            } catch (e) {
                throw new Error('Passkey creation cancelled or failed');
            }

            const verifyResp = await fetch(`${API_BASE}/auth/register/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, response: attResp })
            });

            const verification = await verifyResp.json();
            if (verification.verified) {
                login(verification.token, username);
            } else {
                setError(verification.error || 'Registration failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            // Password Login
            if (password) {
                const resp = await fetch(`${API_BASE}/auth/login/password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await resp.json();
                if (resp.ok) {
                    login(data.token, data.username);
                } else {
                    setError(data.error || 'Login failed');
                }
                return;
            }

            // Passkey Login
            const resp = await fetch(`${API_BASE}/auth/login/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!resp.ok) throw new Error('User not found');

            const options = await resp.json();

            let asseResp;
            try {
                asseResp = await startAuthentication(options);
            } catch (e) {
                throw new Error('Login cancelled or failed');
            }

            const verifyResp = await fetch(`${API_BASE}/auth/login/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, response: asseResp })
            });

            const verification = await verifyResp.json();
            if (verification.verified) {
                login(verification.token, username);
            } else {
                setError(verification.error || 'Login failed');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md animate-slide-up">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <div className="gradient-primary p-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 flex-shrink-0">
                        <svg className="w-8 h-8 text-white flex-shrink-0" width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome to Linka</h1>
                    <p className="text-white/80 text-sm">Save and organize your favorite social media posts</p>
                </div>

                {/* Form Content */}
                <div className="p-8">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Username
                        </label>
                        <input
                            type="text"
                            placeholder="Enter your username"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-apricot focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && username.trim() && handleLogin()}
                        />
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                Password
                            </label>
                            <span className="text-xs text-slate-400">(Optional for Passkeys)</span>
                        </div>
                        <input
                            type="password"
                            placeholder="Enter password (optional)"
                            className="w-full px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-apricot focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && username.trim() && handleLogin()}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-cherry/10 dark:bg-cherry/20 border border-cherry/30 dark:border-cherry/40 rounded-lg">
                            <p className="text-cherry dark:text-cherry text-sm flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={handleLogin}
                            disabled={loading || !username.trim()}
                            className="w-full gradient-primary text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-apricot/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    {password ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                        </svg>
                                    )}
                                    <span>{password ? 'Login with Password' : 'Login with Passkey'}</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleRegister}
                            disabled={loading || !username.trim()}
                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white py-3 px-4 rounded-xl font-semibold hover:bg-camel/20 dark:hover:bg-camel/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <span>{password ? 'Create Account with Password' : 'Create Account with Passkey'}</span>
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-start gap-3 text-xs text-slate-600 dark:text-slate-400">
                            <svg className="w-4 h-4 text-apricot flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p>Secured with passkeys - no passwords needed. Your biometric data never leaves your device.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
