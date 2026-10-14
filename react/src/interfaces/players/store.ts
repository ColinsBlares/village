import { create } from 'zustand';
import { Player } from '@utils/shared/types';
import { useVisibilityStore } from '@utils/visibility/store';

interface PlayersState {
	items: Player[];
}

export const usePlayersStore = create<PlayersState>(() => ({
	items: [],
}));

export function showPlayers(flag: boolean) {
	useVisibilityStore.setState({ players: flag });
}

export function loadPlayers(players: Player[]) {
	usePlayersStore.setState({ items: players });
}

export function addPlayer(player: Player) {
	usePlayersStore.setState(state => ({
		items: [...state.items, player],
	}));
}

export function removePlayer(id: any) {
	usePlayersStore.setState(state => ({
		items: state.items.filter(player => player.id != id),
	}));
}

export function updatePlayer(id: any, data: Partial<Player>) {
	usePlayersStore.setState(state => ({
		items: state.items.map(player =>
			player.id == id ? { ...player, ...data } : player,
		),
	}));
}
