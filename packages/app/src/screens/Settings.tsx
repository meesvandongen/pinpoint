import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Body, Cover, Screen } from '../components/layout.tsx'
import { LANGUAGES, useI18n } from '../i18n/index.ts'
import { clearPhotos } from '../photos/db.ts'
import { enableCompass, useCompassEnabled } from '../state/heading.ts'
import { install, isIOS, isStandalone, useInstall } from '../state/install.ts'
import { resetProgress } from '../state/progress.ts'
import { updateSettings, useSettings } from '../state/settings.ts'

const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = { en: 'English', nl: 'Nederlands' }

function Toggle({ label, help, on, onChange }: { label: string; help: string; on: boolean; onChange(on: boolean): void }) {
  const { t } = useI18n()
  return (
    <div className="setting">
      <div>
        <strong>{label}</strong>
        <small>{help}</small>
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
        {on ? t('common.on') : t('common.off')}
      </button>
    </div>
  )
}

export function Settings() {
  const { t } = useI18n()
  const settings = useSettings()
  const compassOn = useCompassEnabled()
  const installState = useInstall()
  const [compassFailed, setCompassFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const offline = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null

  return (
    <Screen className="settings">
      <Cover title={t('settings.title')}>
        <Link to="/" className="back">
          ‹ {t('common.back')}
        </Link>
      </Cover>
      <Body className="settings-body">
        <div className="setting stacked">
          <strong id="lang-label">{t('settings.language')}</strong>
          <div className="segmented" role="radiogroup" aria-labelledby="lang-label">
            {(['auto', ...LANGUAGES] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={settings.language === value}
                className={settings.language === value ? 'on' : ''}
                onClick={() => updateSettings({ language: value })}
              >
                {value === 'auto' ? t('settings.language.auto') : LANGUAGE_NAMES[value]}
              </button>
            ))}
          </div>
        </div>
        <Toggle label={t('settings.expert')} help={t('settings.expert.help')} on={settings.expert} onChange={(expert) => updateSettings({ expert })} />
        <div className="setting">
          <div>
            <strong>{t('settings.compass')}</strong>
            <small>{compassFailed ? t('settings.compass.denied') : compassOn ? t('settings.compass.on') : t('settings.compass.help')}</small>
          </div>
          {!compassOn && (
            <button type="button" className="btn small" onClick={() => void enableCompass().then((ok) => setCompassFailed(!ok))}>
              {t('settings.compass.turnOn')}
            </button>
          )}
        </div>
        <Toggle label={t('settings.weather')} help={t('settings.weather.help')} on={settings.weatherMarks} onChange={(weatherMarks) => updateSettings({ weatherMarks })} />
        {(installState.prompt || isIOS() || isStandalone() || installState.installed) && (
          <div className="setting">
            <div>
              <strong>{t('settings.install')}</strong>
              <small>
                {isStandalone() || installState.installed ? t('settings.install.done') : installState.prompt ? t('settings.install.help') : t('settings.install.ios')}
              </small>
            </div>
            {installState.prompt && (
              <button type="button" className="btn small" onClick={() => void install()}>
                {t('settings.install')}
              </button>
            )}
          </div>
        )}
        <div className="setting">
          <small>{offline ? t('settings.offline.ready') : t('settings.offline.none')}</small>
        </div>
        {__TEST_TOOLS__ && (
          <div className="setting">
            <small>{t('settings.tools')}</small>
          </div>
        )}
        <div className="setting danger">
          {confirming ? (
            <>
              <small>{t('settings.reset.confirm')}</small>
              <div className="foot-nav">
                <button
                  type="button"
                  className="btn small bad"
                  onClick={() => {
                    resetProgress()
                    void clearPhotos()
                    setConfirming(false)
                  }}
                >
                  {t('settings.reset.yes')}
                </button>
                <button type="button" className="btn small" onClick={() => setConfirming(false)}>
                  {t('settings.reset.no')}
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="btn small" onClick={() => setConfirming(true)}>
              {t('settings.reset')}
            </button>
          )}
        </div>
      </Body>
      <div className="foot" />
    </Screen>
  )
}
