import React from 'react';
import { create } from 'zustand';
import MainDisplay from './components/MainDisplay';

export interface PhoneScreen {
    name: string;
    form: React.ReactElement;
}

interface ScreensState {
    items: PhoneScreen[];
}

export const usePhoneScreens = create<ScreensState>(() => ({
    items: [],
}));

function homeScreen(): PhoneScreen {
    return {
        name: 'MainDisplay',
        form: React.createElement(MainDisplay),
    };
}

export function initPhoneNavigation() {
    usePhoneScreens.setState({ items: [homeScreen()] }, true);
}

export function resetPhoneScreens() {
    usePhoneScreens.setState({ items: [homeScreen()] }, true);
}

export function addAppDisplay(app: PhoneScreen) {
    usePhoneScreens.setState((state) => ({
        items: [...state.items, app],
    }));
}

export function setAppDisplay(app: PhoneScreen) {
    usePhoneScreens.setState({ items: [app] }, true);
}

export function setAppsDisplay(apps: PhoneScreen[]) {
    usePhoneScreens.setState({ items: apps }, true);
}

export function closeAppDisplay() {
    usePhoneScreens.setState((state) => {
        if (state.items.length <= 1) {
            return state;
        }

        return { items: state.items.slice(0, -1) };
    });
}

export function collapseSuccessSell() {
    const items = usePhoneScreens.getState().items;

    if (items.some((app) => app.name === 'SuccessSell')) {
        resetPhoneScreens();
    }
}

export function closeScreenIfOpen(screenName: string) {
    const items = usePhoneScreens.getState().items;

    if (items.some((app) => app.name === screenName)) {
        resetPhoneScreens();
    }
}

export function removeScreenByName(screenName: string) {
    usePhoneScreens.setState((state) => ({
        items: state.items.filter((app) => app.name !== screenName),
    }));
}
