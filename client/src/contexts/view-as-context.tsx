import { createContext, useContext, useState, useCallback } from "react";
import type { UserRole } from "@shared/schema";

interface ViewAsContextType {
  viewAsRole: UserRole | null;
  setViewAsRole: (role: UserRole | null) => void;
  clearViewAs: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export function ViewAsProvider({ children }: { children: React.ReactNode }) {
  const [viewAsRole, setViewAsRoleState] = useState<UserRole | null>(null);

  const setViewAsRole = useCallback((role: UserRole | null) => {
    setViewAsRoleState(role);
  }, []);

  const clearViewAs = useCallback(() => {
    setViewAsRoleState(null);
  }, []);

  return (
    <ViewAsContext.Provider value={{ viewAsRole, setViewAsRole, clearViewAs }}>
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const context = useContext(ViewAsContext);
  if (context === undefined) {
    throw new Error("useViewAs must be used within a ViewAsProvider");
  }
  return context;
}
