import { create } from 'zustand';

export interface TaxiDriverState {
    name?: string;
    orders?: any[];
    isSorted?: boolean;
    activeOrder?: any;
}

export const useTaxiDriverStore = create<TaxiDriverState>(() => ({}));

export function resetTaxiDriver() {
    useTaxiDriverStore.setState({}, true);
}

export function loadInfoTaxiDriver(info: { name: string; orders: any[] }) {
    useTaxiDriverStore.setState({
        name: info.name,
        orders: info.orders,
    });
}

export function addOrderTaxiDriver(order: any) {
    useTaxiDriverStore.setState((state) => ({
        orders: [...(state.orders || []), order],
        isSorted: false,
    }));
}

export function sortOrdersByDistance() {
    useTaxiDriverStore.setState((state) => ({
        isSorted: true,
        orders: [...(state.orders || [])].sort((a, b) => (
            a.distance.toString().localeCompare(b.distance.toString())
        )),
    }));
}

export function takeOrderTaxiDriver(orderId: any) {
    const orders = useTaxiDriverStore.getState().orders || [];
    useTaxiDriverStore.setState({
        activeOrder: orders.find((order) => order.id === orderId),
    });
}

export function cancelOrderTaxiDriver(_orderId?: any) {
    const state = useTaxiDriverStore.getState();

    if (!state.activeOrder) {
        return;
    }

    useTaxiDriverStore.setState({
        activeOrder: null,
        orders: (state.orders || []).filter((order) => order.id !== state.activeOrder.id),
    });
}

export function errorOrderTaxiDriver() {
    useTaxiDriverStore.setState({ activeOrder: null });
}

export function deleteOrderTaxiDriver(orderId: any) {
    useTaxiDriverStore.setState((state) => ({
        orders: (state.orders || []).filter((order) => order.id !== orderId),
    }));
}

export function setDestinationTaxiDriver(area: string, street: string, price: number) {
    useTaxiDriverStore.setState((state) => ({
        activeOrder: {
            ...state.activeOrder,
            isWay: true,
            area,
            street,
            price,
        },
    }));
}
