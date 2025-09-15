import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Moon, Sun } from "lucide-react";

interface HeaderProps {
  onSearch?: (query: string) => void;
  onToggleDark?: () => void;
  isDark?: boolean;
}

export default function Header({ onSearch, onToggleDark, isDark }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    console.log("Search triggered:", searchQuery);
    onSearch?.(searchQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Streetwise</h1>
                <p className="text-xs text-muted-foreground">NYC Real Estate Intelligence</p>
              </div>
            </div>
            
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Beta
            </Badge>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Input
                data-testid="input-search"
                type="text"
                placeholder="Enter StreetEasy URL or property address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10 pr-20"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Button 
                data-testid="button-search"
                onClick={handleSearch}
                size="sm" 
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
              >
                Analyze
              </Button>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center">
            <Button
              data-testid="button-theme-toggle"
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log("Theme toggle triggered");
                onToggleDark?.();
              }}
              className="hover-elevate"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}