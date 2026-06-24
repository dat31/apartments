"use client";

import * as React from "react";
import { SEED_LISTINGS, PALETTE } from "@/lib/data/listings";
import { type Listing, type ListingCore } from "@/schemas/listing";

/* In-memory listings store for the owner flows (dashboard / create / edit).
   Seeded deterministically from SEED_LISTINGS so server + client render match.
   Kept in React state (not localStorage) — listing photos are stored as data
   URLs and would quickly blow past the localStorage quota. State survives
   client-side navigation between the owner pages while the provider stays
   mounted in the (app) layout. */

type ListingsContextValue = {
  listings: Listing[];
  getById: (id: string) => Listing | undefined;
  addListing: (core: ListingCore, status: Listing["status"]) => Listing;
  updateListing: (
    id: string,
    core: ListingCore,
    status: Listing["status"]
  ) => void;
  removeListing: (id: string) => void;
  toggleStatus: (id: string) => void;
};

const ListingsContext = React.createContext<ListingsContextValue | null>(null);

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `l${Date.now()}`;

export function ListingsProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = React.useState<Listing[]>(() => SEED_LISTINGS);

  const getById = React.useCallback(
    (id: string) => listings.find((l) => l.id === id),
    [listings]
  );

  const addListing = React.useCallback(
    (core: ListingCore, status: Listing["status"]) => {
      const listing: Listing = {
        ...core,
        id: newId(),
        owner: "you",
        views: 0,
        palette: Math.floor(Math.random() * PALETTE.length),
        status,
      };
      setListings((prev) => [listing, ...prev]);
      return listing;
    },
    []
  );

  const updateListing = React.useCallback(
    (id: string, core: ListingCore, status: Listing["status"]) => {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...core, status } : l))
      );
    },
    []
  );

  const removeListing = React.useCallback((id: string) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const toggleStatus = React.useCallback((id: string) => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: l.status === "active" ? "draft" : "active" }
          : l
      )
    );
  }, []);

  const value = React.useMemo(
    () => ({
      listings,
      getById,
      addListing,
      updateListing,
      removeListing,
      toggleStatus,
    }),
    [listings, getById, addListing, updateListing, removeListing, toggleStatus]
  );

  return (
    <ListingsContext.Provider value={value}>
      {children}
    </ListingsContext.Provider>
  );
}

export function useListings() {
  const ctx = React.useContext(ListingsContext);
  if (!ctx) {
    throw new Error("useListings must be used within a ListingsProvider");
  }
  return ctx;
}
