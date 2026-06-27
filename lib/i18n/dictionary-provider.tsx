"use client";

import { createContext, useContext } from "react";
import type { Dictionary } from "./dictionaries";

// Makes the server-loaded dictionary available to client components. The
// server layout loads the dictionary and passes it here; client components
// read it with useDictionary(). Server components should call getDictionary
// directly instead.
const DictionaryContext = createContext<Dictionary | null>(null);

export function DictionaryProvider({
  dictionary,
  children,
}: {
  dictionary: Dictionary;
  children: React.ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const dictionary = useContext(DictionaryContext);
  if (!dictionary) {
    throw new Error("useDictionary must be used within a DictionaryProvider");
  }
  return dictionary;
}
