import { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

// All components read one provider; this hook has no separate state or storage listener.
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be inside ThemeProvider");
  return context;
}

export default useTheme;
