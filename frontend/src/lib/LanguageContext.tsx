"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "hi" | "en" | "bilingual";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (hi: string, en: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "bilingual",
  setLanguage: () => {},
  t: (hi: string, en: string) => `${hi} / ${en}`,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>("bilingual");

  useEffect(() => {
    const saved = localStorage.getItem("app_language") as Language;
    if (saved && ["hi", "en", "bilingual"].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  };

  const t = (hi: string, en: string): string => {
    if (language === "hi") return hi;
    if (language === "en") return en;
    return `${hi} / ${en}`;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

