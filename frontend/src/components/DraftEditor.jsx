/**
 * Editable textarea for complaint draft text.
 * Used on Draft.jsx and Escalation.jsx.
 */
export default function DraftEditor({ value, onChange }) {
  return (
    <div>
      <label className="block text-label-bold text-on-surface mb-2">
        Complaint Draft
      </label>
      <textarea
        id="draft-editor"
        className="input-field min-h-[200px] resize-y font-inter"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Your complaint draft will appear here…"
      />
      <p className="text-label-sm text-accent-slate mt-1 text-right">
        {value.length} characters
      </p>
    </div>
  )
}
