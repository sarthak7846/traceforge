"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { signInAction } from "../actions";

type AuthFormProps = {
  mode: "signin" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const isSignUp = mode === "signup";
  const [state, action, pending] = useActionState(signInAction, null);

  useEffect(() => {
    if (!state?.message) return;
    toast.error(state?.message);
  }, [state?.message]);

  return (
    <div className="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-100">
        <div className="border-border bg-card rounded-2xl border p-8 shadow-sm">
          <div className="mb-8 text-center">
            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
              {isSignUp ? "Create an account" : "Welcome back"}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isSignUp ? "Enter your details to get started." : "Sign in to see your LLM metrics."}
            </p>
          </div>

          <form className="space-y-4" action={action}>
            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="name" className="text-foreground text-sm leading-none font-medium">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-foreground text-sm leading-none font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-foreground text-sm leading-none font-medium"
                >
                  Password
                </label>
                {!isSignUp && (
                  <Link
                    href="/auth/forgot-password"
                    className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-2"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
            </div>

            <button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring flex h-10 w-full cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-medium shadow transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-500"
              disabled={pending}
            >
              {isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <Link
                  href="/auth/signin"
                  className="text-foreground font-medium underline underline-offset-2 hover:no-underline"
                >
                  Sign in
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account?{" "}
                <Link
                  href="/auth/signup"
                  className="text-foreground font-medium underline underline-offset-2 hover:no-underline"
                >
                  Sign up
                </Link>
              </>
            )}
          </p>
        </div>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          TraceForge — monitor your LLMs in one place
        </p>
      </div>
    </div>
  );
}
