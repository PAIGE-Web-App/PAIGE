interface OnboardingVisualProps {
  altText?: string;
}

export default function OnboardingVisual({ altText = "Onboarding visual" }: OnboardingVisualProps) {
  return (
    <div className="flex-1 h-full bg-white shadow-md rounded-tl-[30px] rounded-br-[30px] p-4 flex items-center justify-center">
      <img 
        src="/api/optimize-image?src=/glasses.png&f=webp&q=85&w=320" 
        alt={altText} 
        className="max-w-[320px] w-full h-auto opacity-90" 
        loading="eager"
      />
    </div>
  );
}
