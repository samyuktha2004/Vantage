import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type NavigationProps = {
  showBack?: boolean;
  showHome?: boolean;
};

export function Navigation({ showBack = true, showHome = true }: NavigationProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const handleBack = () => {
    window.history.back();
  };

  const handleHome = () => {
    setLocation(user ? "/dashboard" : "/");
  };

  return (
    <div className="bg-white border-b border-border/40 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        {showBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
        {showHome && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHome}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
        )}
      </div>
    </div>
  );
}
