import { Converter } from "./converter";

export default function Home() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-zinc-50 font-sans dark:bg-zinc-950">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-40 -top-40 h-112 w-md rounded-full bg-linear-to-br from-indigo-200/40 to-transparent blur-3xl dark:from-indigo-500/10" />
        <div className="absolute -bottom-40 -right-40 h-112 w-md rounded-full bg-linear-to-tr from-rose-200/40 to-transparent blur-3xl dark:from-rose-500/10" />
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-8 px-5 py-12 sm:py-20">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            Unit Converter
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Convert length, weight, and temperature instantly. Edit either side.
          </p>
        </header>
        <Converter />
        <footer className="text-xs text-zinc-500 dark:text-zinc-500">
          Built with Next.js. Conversions use exact SI definitions where applicable.
        </footer>
      </main>
    </div>
  );
}
