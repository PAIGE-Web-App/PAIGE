interface SectionHeaderProps {
  title: string;
  className?: string;
}

export default function SectionHeader({ title, className = "" }: SectionHeaderProps) {
  return (
    <div className={`my-12 flex items-center gap-2 ${className}`}>
      <span className="text-xs text-[#AB9C95] uppercase tracking-wider font-semibold">
        {title}
      </span>
      <div className="flex-1 h-px bg-[#E0DBD7]"></div>
    </div>
  );
}
