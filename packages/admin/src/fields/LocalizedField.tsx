import { useField, type FieldProps } from 'gitvfs-cms/react'
import { LocalizedInput } from './LocalizedInput.tsx'

type Options = { max?: number; multiline?: boolean }

/** `field({ fieldType: 'localized', customData: { localized: { max } } })`: one text, or one per language. */
export function LocalizedField({ id, parsedField: parsed }: FieldProps) {
  const field = useField(id)
  const options = ((parsed.fieldConfig?.customData as { localized?: Options } | undefined)?.localized ?? {}) as Options
  return (
    <LocalizedInput
      value={field.value as string | Record<string, string> | undefined}
      onChange={field.onChange}
      max={options.max ?? 140}
      multiline={options.multiline}
      label={String(parsed.fieldConfig?.label ?? parsed.key)}
    />
  )
}
