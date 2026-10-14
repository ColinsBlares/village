import { create } from 'zustand';

export interface TaxiClientState {
    location?: { area: string; street: string };
    isSearch?: boolean;
    order?: any;
}

export const useTaxiClientStore = create<TaxiClientState>(() => ({}));

export function loadLocationTaxiClient(area: string, street: string) {
    useTaxiClientStore.setState({
        location: { area, street },
    });
}

export function clearLocationTaxiClient() {
    useTaxiClientStore.setState({ location: undefined });
}

export function ansOrderTaxiClient(order: any) {
    useTaxiClientStore.setState({
        isSearch: false,
        order,
    });
}

export function driverReadyTaxiClient() {
    useTaxiClientStore.setState((state) => ({
        order: {
            ...state.order,
            isReady: true,
        },
    }));
}

export function playerInTaxiClient() {
    useTaxiClientStore.setState((state) => ({
        order: {
            ...state.order,
            isInTaxi: true,
        },
    }));
}

export function setDestinationTaxiClient(area: string, street: string, price: number) {
    useTaxiClientStore.setState((state) => ({
        order: {
            ...state.order,
            area,
            street,
            price,
            isSelect: true,
        },
    }));
}

export function confirmOrderTaxiClient() {
    useTaxiClientStore.setState((state) => ({
        order: {
            ...state.order,
            isWay: true,
        },
    }));
}

export function createOrderTaxiClient() {
    useTaxiClientStore.setState({ isSearch: true });
}

export function cancelOrderTaxiClient() {
    useTaxiClientStore.setState({}, true);
}

export function errorOrderTaxiClient() {
    useTaxiClientStore.setState((state) => ({
        order: {
            ...state.order,
            isWay: false,
        },
    }));
}
