import React from 'react';
import BankMenu from './components/BankMenu';
import { setResetBankPages, useBankPages } from './pagesStore';

export { useBankPages } from './pagesStore';

function menuPage(): React.ReactElement {
    return React.createElement(BankMenu);
}

function resetToMenu() {
    useBankPages.setState({ items: [menuPage()] }, true);
}

setResetBankPages(resetToMenu);

export function initBankNavigation() {
    resetToMenu();
}

export function resetBankPages() {
    resetToMenu();
}

export function addBankPage(page: React.ReactElement) {
    useBankPages.setState((state) => ({
        items: [...state.items, page],
    }));
}

export function setBankPage(page: React.ReactElement) {
    useBankPages.setState({ items: [page] }, true);
}

export function closeBankPage() {
    useBankPages.setState((state) => {
        if (state.items.length <= 1) {
            return state;
        }

        return { items: state.items.slice(0, -1) };
    });
}
