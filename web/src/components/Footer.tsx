export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-800/70 bg-slate-950/80 px-4 py-7 text-center text-xs leading-relaxed text-slate-500">
      <div className="mx-auto mb-3 flex items-center justify-center gap-2 text-slate-400">
        <img src="./icon.svg" alt="" width={18} height={18} className="h-[18px] w-[18px]" aria-hidden />
        <span className="font-display text-sm tracking-wide">Nexus Nook</span>
      </div>
      <p className="mx-auto max-w-3xl">
        Nexus Nook is an unofficial, fan-made application and is not affiliated with or
        endorsed by Cloud Imperium Games. Star Citizen&reg; is a registered trademark of
        Cloud Imperium Rights LLC.
      </p>
      <p className="mt-2 text-slate-600">
        We never ask for your RSI password. All RSI data is your own public handle, entered
        by you.
      </p>
      <p className="mt-3 text-slate-600">
        &copy; 2026 Cole Houston. All Rights Reserved. ·{' '}
        <a href="#/privacy" className="underline hover:text-slate-400">
          Privacy Policy
        </a>
      </p>
    </footer>
  )
}
