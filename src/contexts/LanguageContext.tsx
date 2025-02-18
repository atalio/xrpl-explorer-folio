
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type LanguageContextType = {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadLanguageLabels = async () => {
      try {
        const response = await import(`../i18n/${currentLanguage}.json`);
        setLabels(response.default);
      } catch (error) {
        console.error(`Failed to load language: ${currentLanguage}`, error);
        // Fallback to English if language load fails
        if (currentLanguage !== 'en') {
          const enResponse = await import('../i18n/en.json');
          setLabels(enResponse.default);
        }
      }
    };

    loadLanguageLabels();
  }, [currentLanguage]);

  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('preferred-language', lang);
  };

  const t = (key: string) => labels[key] || key;

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
