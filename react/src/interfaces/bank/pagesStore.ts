import React from 'react';
import { create } from 'zustand';

interface BankPagesState {
    items: React.ReactElement[];
}

export const useBankPages = create<BankPagesState>(() => ({
    items: [],
}));

let resetBankPagesImpl = function () {
    useBankPages.setState({ items: [] }, true);
};

export function setResetBankPages(impl: () => void) {
    resetBankPagesImpl = impl;
}

export function resetBankPages() {
    resetBankPagesImpl();
}
