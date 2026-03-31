"use client"

import { signIn } from "next-auth/react"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - gradient branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500 flex-col justify-between p-12 overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '28px 28px',
        }} />

        <div className="relative z-10">
          {/* Wordmark */}
          <div className="flex items-center gap-3 mb-2">
            <Image src="/logo.png" alt="DentalAdmin logo" width={40} height={40} className="rounded-lg" />
            <span className="text-2xl font-semibold text-white tracking-tight">DentalAdmin</span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-semibold text-white leading-snug tracking-tight">
            Practice management,<br />
            simplified.
          </h2>
          <p className="text-indigo-100 text-[15px] leading-relaxed max-w-sm">
            Monitor production, track employee activity, and manage claims
            — all from a single dashboard built for dental offices.
          </p>
          <div className="flex items-center gap-2 pt-2">
            <div className="h-1 w-8 rounded-full bg-white/30" />
            <div className="h-1 w-8 rounded-full bg-white/60" />
            <div className="h-1 w-8 rounded-full bg-white/30" />
          </div>
        </div>

        <p className="relative z-10 text-indigo-200/70 text-xs">
          &copy; {new Date().getFullYear()} DentalAdmin
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center bg-stone-50/60 px-6 py-12">
        <div className="w-full max-w-[380px]">
          {/* Mobile-only branding */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-2.5 mb-3">
              <Image src="/logo.png" alt="DentalAdmin logo" width={36} height={36} className="rounded-lg" />
              <span className="text-xl font-semibold text-slate-800 tracking-tight">DentalAdmin</span>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-8">
            <div className="mb-7">
              <h1 className="text-[22px] font-semibold text-slate-800 tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-slate-400 mt-1.5">
                Sign in to your dashboard
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-[13px] font-medium text-slate-600 mb-1.5 tracking-wide">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-300 transition-all duration-150 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  placeholder="admin@dental.local"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[13px] font-medium text-slate-600 mb-1.5 tracking-wide">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-slate-800 placeholder:text-slate-300 transition-all duration-150 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-sm text-white transition-all duration-200 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-[0_1px_2px_rgba(99,102,241,0.4)] hover:shadow-[0_2px_8px_rgba(99,102,241,0.35)] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-slate-400 mt-6 tracking-wide">
            Runs locally in your office. Your data stays here.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-stone-50/60">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
