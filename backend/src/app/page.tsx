export default function BackendStatusPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300">
        DC Smart Laundry
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">Backend service</h1>
      <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
        The API service is running. Application requests are served from the /api routes.
      </p>
      <a
        className="mt-8 w-fit rounded-lg border border-emerald-400/40 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-400/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        href="/api/health"
      >
        Check service health
      </a>
    </main>
  );
}
