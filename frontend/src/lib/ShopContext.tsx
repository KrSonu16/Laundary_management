"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface ShopSettings {
  SHOP_NAME?: string;
  SHOP_TAGLINE?: string;
  SHOP_PHONE?: string;
  SHOP_ADDRESS?: string;
  [key: string]: string | undefined;
}

interface ShopContextType {
  shopName: string;
  shopTagline: string;
  settings: ShopSettings;
  refreshSettings: () => Promise<void>;
}

const DEFAULT_SHOP_NAME = "DC Laundry";
const DEFAULT_TAGLINE = "Shop operations";

const ShopContext = createContext<ShopContextType>({
  shopName: DEFAULT_SHOP_NAME,
  shopTagline: DEFAULT_TAGLINE,
  settings: {},
  refreshSettings: async () => {},
});

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ShopSettings>({});

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch {
      // silently fail — defaults will be used
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const shopName = settings.SHOP_NAME?.trim() || DEFAULT_SHOP_NAME;
  const shopTagline = settings.SHOP_TAGLINE?.trim() || DEFAULT_TAGLINE;

  return (
    <ShopContext.Provider value={{ shopName, shopTagline, settings, refreshSettings: fetchSettings }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => useContext(ShopContext);
