import { useId } from 'react'

/** Languages offered when adding a translation. Any other code can still be written in the file by hand. */
export const COMMON_LANGUAGES = ['en', 'nl', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'sv', 'da', 'tr'] as const

export type LocalizedValue = string | Record<string, string> | null | undefined

const isRecord = (value: LocalizedValue): value is Record<string, string> => typeof value === 'object' && value !== null

/**
 * Text that is one plain string, or a map of language to text. With one language it is a plain input;
 * "Add a language" turns it into a map, one row per language.
 */
export function LocalizedInput({
  value,
  onChange,
  max,
  multiline = false,
  label,
}: {
  value: LocalizedValue
  /** `undefined` when the text was emptied, so an optional text can be left out. */
  onChange(next: string | Record<string, string> | undefined): void
  max: number
  multiline?: boolean
  label: string
}) {
  const base = useId()
  const entries = isRecord(value) ? Object.entries(value) : []
  const used = new Set(entries.map(([lang]) => lang))
  const available = COMMON_LANGUAGES.filter((lang) => !used.has(lang))

  const Input = multiline ? 'textarea' : 'input'
  const counter = (text: string) => (
    <span className={`pp-counter ${text.length > max ? 'over' : ''}`} aria-label={`${text.length} of ${max} characters`}>
      {text.length}/{max}
    </span>
  )

  const addLanguage = (lang: string) => {
    if (isRecord(value)) onChange({ ...value, [lang]: '' })
    else onChange({ en: typeof value === 'string' ? value : '', [lang]: '' })
  }

  return (
    <div className="pp-localized">
      {!isRecord(value) ? (
        <div className="pp-localized-row">
          <Input
            id={`${base}-text`}
            className="gcms-input"
            aria-label={label}
            value={typeof value === 'string' ? value : ''}
            maxLength={max * 2}
            rows={multiline ? 3 : undefined}
            onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
          />
          {counter(typeof value === 'string' ? value : '')}
        </div>
      ) : (
        entries.map(([lang, text]) => (
          <div className="pp-localized-row" key={lang}>
            <code className="pp-lang">{lang}</code>
            <Input
              className="gcms-input"
              aria-label={`${label} (${lang})`}
              value={text}
              maxLength={max * 2}
              rows={multiline ? 3 : undefined}
              onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
            />
            {counter(text)}
            <button
              type="button"
              className="gcms-button gcms-button--small"
              aria-label={`Remove ${lang}`}
              onClick={() => {
                const { [lang]: _, ...rest } = value
                // Removing the last language leaves an empty text.
                const left = Object.values(rest)
                onChange(left.length === 0 ? '' : rest)
              }}
            >
              ×
            </button>
          </div>
        ))
      )}
      {available.length > 0 && (
        <label className="pp-add-language">
          <span className="gcms-muted">Add a language</span>
          <select
            className="gcms-input"
            value=""
            aria-label={`Add a language to ${label}`}
            onChange={(e) => e.target.value && addLanguage(e.target.value)}
          >
            <option value="">…</option>
            {available.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
