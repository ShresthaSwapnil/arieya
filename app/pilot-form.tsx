"use client";

import { FormEvent, useState } from "react";

export function PilotForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    const form = new FormData(event.currentTarget);
    try {
    const response = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    setStatus(response.ok ? "success" : "error");
    } catch { setStatus("error"); }
  }

  if (status === "success") {
    return (
      <div className="form-success" role="status">
        <span aria-hidden="true">✦</span>
        <h3>You’re on the list.</h3>
        <p>Your details have been saved. Thank you for your interest in Arieya early access.</p>
      </div>
    );
  }

  return (
    <form className="pilot-form" onSubmit={submit}>
      <label>
        Full Name
        <input name="name" autoComplete="name" placeholder="Your name" required minLength={2} maxLength={100} />
      </label>
      <label>
        Work email
        <input name="email" type="email" autoComplete="email" placeholder="you@yourstore.com" required maxLength={200} />
      </label>
      <label className="form-wide">
        Website URL
        <input name="storeUrl" type="url" placeholder="https://yourstore.com" required maxLength={300} />
      </label>
      <button className="button button--primary form-wide" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Request my pilot conversation ↗"}
      </button>
      {status === "error" && (
        <p className="form-error form-wide" role="alert">
          We could not submit your inquiry. Please verify the domain and email, then try again.
        </p>
      )}
    </form>
  );
}
