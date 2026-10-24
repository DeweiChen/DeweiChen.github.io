import { Box, FileText, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslation } from 'react-i18next'
import { useLang } from '@/i18n/useLang'
import { cn } from '@/lib/utils'
import type { Lang } from '@/data/resume'

export type Mode = 'classic' | 'immersive'

interface TopBarProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
  immersiveAvailable: boolean
  busy: boolean
}

export function TopBar({ mode, onModeChange, immersiveAvailable, busy }: TopBarProps) {
  const { lang, setLang } = useLang()
  const { t } = useTranslation()

  return (
    <header className="fixed inset-x-0 top-0 z-50 print:hidden">
      {/* Classic lines up with the content column; immersive spreads to the screen edges like the tour HUD. */}
      <div
        className={cn(
          'mx-auto flex h-14 items-center justify-between gap-2 px-4 transition-[max-width,padding] duration-700 ease-in-out',
          mode === 'classic' ? 'max-w-6xl' : 'max-w-[100vw] sm:px-8',
        )}
      >
        <a
          href="#top"
          className="bg-gradient-to-r from-brand-from to-brand-to bg-clip-text text-lg font-bold tracking-tight text-transparent"
        >
          DW
        </a>

        <div className="flex items-center gap-1.5 rounded-xl border bg-background/60 p-1 backdrop-blur-md">
          {mode === 'classic' && (
            <Button variant="ghost" size="icon-sm" onClick={() => window.print()} aria-label={t('labels.print')}>
              <Printer />
            </Button>
          )}

          <ToggleGroup
            type="single"
            size="sm"
            spacing={0}
            value={lang}
            onValueChange={(v) => v && setLang(v as Lang)}
            aria-label={t('labels.language')}
          >
            <ToggleGroupItem value="zh" className="px-2.5">中</ToggleGroupItem>
            <ToggleGroupItem value="en" className="px-2.5">EN</ToggleGroupItem>
          </ToggleGroup>

          <div className="mx-0.5 h-5 w-px bg-border" />

          <ToggleGroup
            type="single"
            size="sm"
            spacing={0}
            value={mode}
            disabled={busy}
            onValueChange={(v) => v && v !== mode && onModeChange(v as Mode)}
            aria-label={t('labels.layout')}
          >
            <ToggleGroupItem value="classic" className="gap-1.5 px-2.5">
              <FileText />
              <span className="hidden sm:inline">{t('labels.classic')}</span>
            </ToggleGroupItem>
            {immersiveAvailable ? (
              <ToggleGroupItem value="immersive" className="gap-1.5 px-2.5">
                <Box />
                <span className="hidden sm:inline">{t('labels.immersive')}</span>
              </ToggleGroupItem>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <ToggleGroupItem value="immersive" disabled className="gap-1.5 px-2.5">
                      <Box />
                      <span className="hidden sm:inline">{t('labels.immersive')}</span>
                    </ToggleGroupItem>
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('labels.webglUnavailable')}</TooltipContent>
              </Tooltip>
            )}
          </ToggleGroup>
        </div>
      </div>
    </header>
  )
}
