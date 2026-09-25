"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">Let’s try that again</p>
      <h1 className="heading mt-3">We couldn’t load this page.</h1>
      <p className="my-5 text-muted">
        Please try again in a moment. If this continues, contact your
        administrator.
      </p>
      <button className="btn" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
