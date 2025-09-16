interface FooterProps {
  onPrivacyClick?: () => void;
}

export default function Footer({ onPrivacyClick }: FooterProps) {
  return (
    <footer className="bg-background border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Copyright */}
          <div className="text-xs text-muted-foreground">
            Campbell Fulham, All Rights Reserved.
          </div>

          {/* Privacy Policy */}
          <button
            onClick={onPrivacyClick}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy Policy
          </button>
        </div>
      </div>
    </footer>
  );
}