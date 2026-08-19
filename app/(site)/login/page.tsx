import { Suspense } from "react";
import LoginForm from "@/components/login-form";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl tracking-tight text-primary">
          Log in
        </h1>
        <p className="text-body-muted text-sm mt-2">
          Enter your phone number to receive a one-time code.
        </p>
      </div>
      <Suspense
        fallback={<div className="h-64 animate-pulse bg-soft-stone rounded-sm" />}
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
