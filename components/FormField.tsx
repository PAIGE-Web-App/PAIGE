type FormFieldProps = {
  label: React.ReactNode;
  name: string;
  value: string | undefined; // Change the type of value
  placeholder: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
};

export default function FormField({
  label,
  name,
  value = "", // Provide a default value
  placeholder,
  onChange,
  error,
  type = "text",
}: FormFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-[#332B42]">{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full border border-[#AB9C95] px-4 py-2 text-sm rounded-[5px] focus:outline-none focus:ring-2 focus:ring-[#A85C36]"
      />
      {error && <div className="text-xs text-red-500">{error}</div>}
    </label>
  );
}
