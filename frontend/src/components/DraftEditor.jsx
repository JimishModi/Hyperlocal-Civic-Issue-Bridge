/**
 * Editable textarea for complaint draft text.
 * Used on Draft.jsx and Escalation.jsx.
 */
import { useTranslation } from 'react-i18next'

export default function DraftEditor({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div>
      <label className="block text-label-bold text-on-surface mb-2">
        {t('draft.editorLabel')}
      </label>
      <textarea
        id="draft-editor"
        className="input-field min-h-[200px] resize-y font-inter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('draft.editorPlaceholder')}
      />
      <p className="text-label-sm text-accent-slate mt-1 text-right">
        {t('draft.charCount', { count: value.length })}
      </p>
    </div>
  )
}
