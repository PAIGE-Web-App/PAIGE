interface OnboardingVisualProps {
  altText?: string;
}

export default function OnboardingVisual({ altText = "Onboarding visual" }: OnboardingVisualProps) {
  return (
    <div className="flex-1 bg-white shadow-md rounded-tl-[30px] rounded-br-[30px] p-4 flex items-center justify-center">
      <img 
        src="/ringsonboarding.png" 
        alt={altText} 
        className="w-[480px] h-auto opacity-90" 
      />
    </div>
  );
}
