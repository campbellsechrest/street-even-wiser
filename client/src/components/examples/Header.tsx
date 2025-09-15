import { useState } from "react";
import Header from "../Header";

export default function HeaderExample() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? "dark" : ""}>
      <Header
        onSearch={(query) => console.log("Search:", query)}
        onToggleDark={() => setIsDark(!isDark)}
        isDark={isDark}
      />
      <div className="h-32 bg-background" />
    </div>
  );
}