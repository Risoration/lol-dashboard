'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Summoner } from '../database/types';

export type Region = 'ALL' | 'NA1' | 'EUW1';
export type QueueType = 'ALL' | 'RANKED_SOLO_5x5' | 'RANKED_FLEX_SR';

interface AccountFilters {
  region: Region;
  queueType: QueueType;
  selectedSummonerId: string | null; // null means "all accounts"
}

interface AccountContextType {
  summoners: Summoner[];
  filters: AccountFilters;
  isFetching: boolean;
  setRegion: (region: Region) => void;
  setQueueType: (queueType: QueueType) => void;
  setSelectedSummoner: (summonerId: string | null) => void;
  setSummoners: (summoners: Summoner[]) => void;
  setIsFetching: (isFetching: boolean) => void;
  getFilteredSummoners: () => Summoner[];
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [summoners, setSummoners] = useState<Summoner[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [filters, setFilters] = useState<AccountFilters>({
    region: 'ALL',
    queueType: 'ALL',
    selectedSummonerId: null,
  });

  const setRegion = (region: Region) => {
    setFilters((prev) => ({ ...prev, region }));
  };

  const setQueueType = (queueType: QueueType) => {
    setFilters((prev) => ({ ...prev, queueType }));
  };

  const setSelectedSummoner = (summonerId: string | null) => {
    setFilters((prev) => ({ ...prev, selectedSummonerId: summonerId }));
  };

  const getFilteredSummoners = () => {
    if (filters.selectedSummonerId) {
      return summoners.filter((s) => s.id === filters.selectedSummonerId);
    }

    if (filters.region === 'ALL') {
      return summoners;
    }

    return summoners.filter((s) => s.region === filters.region);
  };

  return (
    <AccountContext.Provider
      value={{
        summoners,
        filters,
        isFetching,
        setRegion,
        setQueueType,
        setSelectedSummoner,
        setSummoners,
        setIsFetching,
        getFilteredSummoners,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  const context = useContext(AccountContext);
  if (context === undefined) {
    throw new Error('useAccount must be used within an AccountProvider');
  }
  return context;
}
