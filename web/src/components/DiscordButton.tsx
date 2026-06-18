import { DISCORD_INVITE } from '../services/store'

export default function DiscordButton({ className = '' }: { className?: string }) {
  const href = DISCORD_INVITE && DISCORD_INVITE.trim() !== '' ? DISCORD_INVITE : '#'
  const enabled = href !== '#'

  return (
    <a
      href={href}
      target={enabled ? '_blank' : undefined}
      rel={enabled ? 'noreferrer noopener' : undefined}
      title={enabled ? 'Join our Discord' : 'Discord link coming soon'}
      aria-disabled={!enabled}
      onClick={(e) => {
        if (!enabled) e.preventDefault()
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] ${
        enabled ? '' : 'cursor-not-allowed opacity-70'
      } ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3.2a.07.07 0 0 0-.074.035c-.32.57-.677 1.314-.927 1.898a18.27 18.27 0 0 0-5.114 0 12.6 12.6 0 0 0-.94-1.898.073.073 0 0 0-.074-.035A19.736 19.736 0 0 0 5.677 4.37a.064.064 0 0 0-.03.026C2.4 9.045 1.515 13.58 1.949 18.057a.08.08 0 0 0 .031.054 19.9 19.9 0 0 0 5.993 3.03.07.07 0 0 0 .078-.026c.462-.63.873-1.295 1.226-1.994a.07.07 0 0 0-.038-.098 13.1 13.1 0 0 1-1.872-.892.07.07 0 0 1-.007-.117c.126-.094.252-.192.372-.291a.07.07 0 0 1 .073-.01c3.927 1.793 8.18 1.793 12.061 0a.07.07 0 0 1 .074.009c.12.099.246.198.373.292a.07.07 0 0 1-.006.117c-.598.35-1.22.644-1.873.891a.07.07 0 0 0-.037.099c.36.698.772 1.362 1.225 1.993a.07.07 0 0 0 .078.027 19.84 19.84 0 0 0 6.002-3.03.07.07 0 0 0 .03-.053c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.03-.027ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.955 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.946 2.42-2.157 2.42Z" />
      </svg>
      Join our Discord
    </a>
  )
}
