import React, { memo } from 'react';
import Stats from './Stats';
import Coins from './Coins';
import Selector from './Selector';
import CreateCharacter from './CreateCharacter';
import AddSlot from './AddSlot';

function CharacterInfo() {
	return (
		<React.Fragment>
			<Stats />
			<Coins />
			<Selector />
			<CreateCharacter />
			<AddSlot />
		</React.Fragment>
	);
}

export default memo(CharacterInfo);
