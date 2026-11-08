import { useMemo } from 'react'
import type { Category } from 'pinpoint-core'
import { useSettings } from '../state/settings.ts'
import { en, enCategories, type MessageKey } from './en.ts'
import { nl, nlCategories } from './nl.ts'

export type { MessageKey }
export const LANGUAGES = ['en', 'nl'] as const
export type Language = (typeof LANGUAGES)[number]

const catalogs: Record<Language, { messages: Record<MessageKey, string>; categories: Record<Category, string> }> = {
  en: { messages: en, categories: enCategories },
  nl: { messages: nl, categories: nlCategories },
}

const isLanguage = (value: string): value is Language => (LANGUAGES as readonly string[]).includes(value)

/** The language to show the interface in: the player's choice, or the first supported language of the device. */
export function resolveLanguage(choice: 'auto' | Language, deviceLanguages: readonly string[]): Language {
  if (choice !== 'auto') return choice
  for (const lang of deviceLanguages) {
    const base = lang.toLowerCase().split('-')[0]
    if (isLanguage(base)) return base
  }
  return 'en'
}

export function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

export type Translator = {
  language: Language
  /** Languages to try for texts that come from quest files: the interface language first. */
  contentLanguages: string[]
  t(key: MessageKey, params?: Record<string, string | number>): string
  /** Picks `<key>.one` or `<key>.other` for a count and fills in `{n}`. */
  tp(key: string, n: number, params?: Record<string, string | number>): string
  category(category: Category): string
  formatDate(iso: string): string
}

export function createTranslator(language: Language, deviceLanguages: readonly string[]): Translator {
  const { messages, categories } = catalogs[language]
  const plural = new Intl.PluralRules(language)
  const lookup = (key: string) => (messages as Record<string, string | undefined>)[key] ?? key
  return {
    language,
    contentLanguages: [language, ...deviceLanguages.filter((l) => l.toLowerCase().split('-')[0] !== language)],
    t: (key, params) => interpolate(messages[key], params),
    tp: (key, n, params) => interpolate(lookup(`${key}.${plural.select(n) === 'one' ? 'one' : 'other'}`), { n, ...params }),
    category: (category) => categories[category],
    formatDate: (iso) => new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)),
  }
}

const deviceLanguages = () => (typeof navigator !== 'undefined' && navigator.languages?.length ? [...navigator.languages] : ['en'])

/** The translator for the current language setting. */
export function useI18n(): Translator {
  const { language } = useSettings()
  return useMemo(() => createTranslator(resolveLanguage(language, deviceLanguages()), deviceLanguages()), [language])
}

export { catalogs }
