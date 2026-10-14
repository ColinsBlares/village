import React, { memo } from 'react';
import { useSelectMenuStore } from '../../store';
import { itemValuesType } from '../../view';
import TextSelector from '../TextSelector';
import ColorSelector from '../ColorSelector';
import NumberSelector from '../NumberSelector';

function Selector() {
	const kind = useSelectMenuStore(state => {
		if (!state.menu || !state.menu.items || !state.menu.items[state.menu.i]) return -1;
		return itemValuesType(state.menu, state.menu.i);
	});

	if (kind === 0) return <TextSelector />;
	if (kind === 1) return <ColorSelector />;
	if (kind === 2) return <NumberSelector />;
	return null;
}

export default memo(Selector);
