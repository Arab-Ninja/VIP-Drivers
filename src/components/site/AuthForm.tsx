"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

import { registerAccount } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/i18n/client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.8l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.71v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.67a7.2 7.2 0 0 1 0-4.6V7.09H1.71a12 12 0 0 0 0 10.56l3.84-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.4 0 3.42 2.64 1.71 6.49l3.84 2.98C6.46 6.76 9 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function AuthForm({ mode, googleEnabled }: { mode: "login" | "signup"; googleEnabled: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Until React has hydrated, this form has no submit handler, and a native
  // submit would put the password in the query string and the browser's
  // history. Disabling the button until then removes that window entirely.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Preserved through the whole sign-in round trip so a visitor who was part
  // way through a booking lands back on it. With no explicit destination,
  // /dashboard routes the person to the area their role belongs to.
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const isSignup = mode === "signup";

  async function doCredentialsSignIn(email: string, password: string) {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError(t.auth.invalidCredentials);
      toast.error(t.auth.invalidCredentials);
      return false;
    }
    router.push(callbackUrl);
    router.refresh();
    return true;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");

    startTransition(async () => {
      if (isSignup) {
        if (password !== String(data.get("passwordConfirm") ?? "")) {
          setError(t.auth.passwordMismatch);
          return;
        }

        const result = await registerAccount({
          name: String(data.get("name") ?? ""),
          email,
          phone: String(data.get("phone") ?? ""),
          password,
        });

        if (!result.ok) {
          const message =
            result.error === "email_taken" ? t.auth.emailTaken : t.auth.genericError;
          setError(message);
          toast.error(message);
          return;
        }

        if (await doCredentialsSignIn(email, password)) toast.success(t.auth.signupSuccess);
        return;
      }

      await doCredentialsSignIn(email, password);
    });
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="flex justify-center">
        <Logo />
      </Link>

      <div className="surface mt-10 rounded-lg p-7 sm:p-9">
        <h1 className="font-display text-3xl text-ink-100">
          {isSignup ? t.auth.signupTitle : t.auth.loginTitle}
        </h1>
        <p className="mt-2 text-sm text-ink-300">
          {isSignup ? t.auth.signupSubtitle : t.auth.loginSubtitle}
        </p>

        {googleEnabled ? (
          <>
            <Button
              type="button"
              variant="subtle"
              className="mt-7 w-full"
              disabled={pending}
              onClick={() => signIn("google", { callbackUrl })}
            >
              <GoogleIcon />
              {t.auth.continueWithGoogle}
            </Button>

            <div className="my-6 flex items-center gap-4">
              <span className="h-px flex-1 bg-ink-700" />
              <span className="text-xs text-ink-400">{t.auth.orEmail}</span>
              <span className="h-px flex-1 bg-ink-700" />
            </div>
          </>
        ) : (
          <p className="mt-6 rounded-sm border border-ink-700 bg-ink-850 px-4 py-3 text-xs leading-relaxed text-ink-300">
            {t.auth.googleUnavailable}
          </p>
        )}

        <form onSubmit={onSubmit} className={googleEnabled ? "" : "mt-6"}>
          <div className="space-y-4">
            {isSignup ? (
              <>
                <FormField label={t.auth.name} htmlFor="name">
                  <Input id="name" name="name" required minLength={2} autoComplete="name" />
                </FormField>
                <FormField label={t.auth.phone} hint={t.common.optional} htmlFor="phone">
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+32 4.. .. .. .." />
                </FormField>
              </>
            ) : null}

            <FormField label={t.auth.email} htmlFor="email">
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </FormField>

            <FormField
              label={t.auth.password}
              hint={isSignup ? t.auth.passwordHint : undefined}
              htmlFor="password"
            >
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
              />
            </FormField>

            {isSignup ? (
              <FormField label={t.auth.passwordConfirm} htmlFor="passwordConfirm">
                <Input
                  id="passwordConfirm"
                  name="passwordConfirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </FormField>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="mt-4 text-xs text-danger">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="mt-6 w-full" disabled={pending || !hydrated}>
            {pending ? t.common.loading : isSignup ? t.auth.signup : t.auth.login}
            {!pending ? isSignup ? <UserPlus /> : <LogIn /> : null}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-400">
          {isSignup ? t.auth.hasAccount : t.auth.noAccount}{" "}
          <Link
            href={
              isSignup
                ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`
            }
            className="text-gold-300 underline-offset-4 hover:underline"
          >
            {isSignup ? t.auth.login : t.auth.signup}
          </Link>
        </p>
      </div>

      <p className="mt-8 text-center text-xs text-ink-500">
        <Link href="/driver/apply" className="text-ink-400 hover:text-gold-300">
          {t.nav.becomeDriver}
        </Link>
      </p>
    </div>
  );
}
