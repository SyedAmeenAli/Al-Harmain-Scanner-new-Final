import { createContext, useContext, useState } from "react";

const UIContext = createContext(null);

export const UIProvider = ({ children }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <UIContext.Provider
      value={{
        searchOpen,
        openSearch: () => setSearchOpen(true),
        closeSearch: () => setSearchOpen(false),
        mobileMenuOpen,
        setMobileMenuOpen,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be inside UIProvider");
  return ctx;
};
