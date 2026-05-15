import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="neon-card p-8 max-w-md w-full text-center">
        <div className="text-lg font-semibold">GED Math Tutoring</div>
        <p className="mt-2 text-sm text-[var(--muted)]">Use the login page to continue.</p>
        <Link className="neon-button inline-block mt-6" href="/login">
          Go to login
        </Link>
      </div>
    </div>
  );
}
