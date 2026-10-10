import { useId } from 'preact/hooks';

export interface SelectProps {
  label: string;
  value: string;
  options: readonly { value: string; label: string; disabled?: boolean }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function Select({ label, value, options, disabled, onChange }: SelectProps) {
  const id = useId();
  return (
    <div class="ff-field">
      <label for={id}>{label}</label>
      <select
        id={id}
        class="ff-input"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
