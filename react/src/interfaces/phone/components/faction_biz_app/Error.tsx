import React, { Fragment, useState, useRef } from 'react';
import Header from './Header';
import { useVisibilityStore } from '@utils/visibility/store';
import { useChatStore } from '../../../chat/store';
import { usePhoneScreens, closeAppDisplay } from '../../navigation';
import {
	usePhoneStore,
	disableHomePhone,
	setOrderStatusBusinessFaction,
} from '../../store';
import { useDialogsStore } from '../../dialogs';
import { useHouseStore, useEnterMenuStore } from '../../../house/store';
import { useBusinessStore } from '../../../business/store';
import { useBankStore } from '../../../bank/store';
import { useBankPages } from '../../../bank/pagesStore';
import { useTaxiClientStore } from '../../taxiClient';
import { useTaxiDriverStore } from '../../taxiDriver';
import { usePlayersStore } from '../../../players/store';

function Error(ownProps) {
	const visibility = useVisibilityStore();
	const chat = useChatStore();
	const screens = usePhoneScreens(state => state.items);
	const phone = usePhoneStore();
	const dialogs = useDialogsStore();
	const house = useHouseStore();
	const enterMenu = useEnterMenuStore();
	const business = useBusinessStore();
	const bank = useBankStore();
	const bankPages = useBankPages(state => state.items);
	const taxiClient = useTaxiClientStore();
	const taxiDriver = useTaxiDriverStore();
	const players = usePlayersStore(state => state.items);
	const props = {
		...ownProps,
		forms: visibility,
		chat,
		apps: screens,
		info: phone,
		dialogs,
		house,
		enterMenu,
		bank,
		bankPages,
		taxiClient,
		taxiDriver,
		players,
		business: phone.factionBiz,
		closeApp: closeAppDisplay,
		disableHome: disableHomePhone,
		setOrderStatusFaction: setOrderStatusBusinessFaction,
	};
	const [state, setReactState] = useState(() => ({}));

	function setState(update) {
		setReactState(prev => {
			const partial = typeof update === 'function' ? update(prev) : update;
			return { ...prev, ...partial };
		});
	}

	const selfRef = useRef(null);
	const readyRef = useRef(false);

	if (selfRef.current == null) {
		selfRef.current = {};
	}

	const self = selfRef.current;
	self.props = props;
	self.state = state;

	self.back = () => {
		const { closeApp, disableHome, setOrderStatusFaction } = self.props;
		disableHome(false);
		setOrderStatusFaction(null); //
		//

		closeApp();
	};

	return (() => {
		const { business, status } = self.props;
		return (
			<Fragment>
				<div className='back_page-phone-react'>
					<Header business={business} />

					<div
						style={{
							textAlign: 'center',
							marginTop: '50%',
						}}
					>
						<svg
							id='Group_105'
							data-name='Group 105'
							xmlns='http://www.w3.org/2000/svg'
							width='40%'
							height='40%'
							viewBox='0 0 100.956 100.956'
							fill='#313539'
						>
							<path
								id='Path_167'
								data-name='Path 167'
								d='M50.478,0a50.478,50.478,0,1,0,50.478,50.478A50.535,50.535,0,0,0,50.478,0Zm0,97.073a46.6,46.6,0,1,1,46.6-46.6A46.649,46.649,0,0,1,50.478,97.073Z'
							/>
							<path
								id='Path_168'
								data-name='Path 168'
								d='M54.261,16.569a1.939,1.939,0,0,0-2.745,0l-16.1,16.1-16.1-16.1a1.941,1.941,0,0,0-2.745,2.745l16.1,16.1-16.1,16.1a1.941,1.941,0,1,0,2.745,2.745l16.1-16.1,16.1,16.1a1.941,1.941,0,0,0,2.745-2.745l-16.1-16.1,16.1-16.1A1.939,1.939,0,0,0,54.261,16.569Z'
								transform='translate(15.063 15.063)'
							/>
						</svg>
						<div>{status}</div>
					</div>

					<div
						className='house_buttons-phone-react'
						style={{
							bottom: '6%',
							position: 'absolute',
						}}
					>
						<div className='house_button-phone-react' onClick={self.back}>
							<span className='ico_button_house-phone-react'>
								<svg
									xmlns='http://www.w3.org/2000/svg'
									width='80%'
									height='80%'
									viewBox='0 0 16.37 16.369'
									style={{
										marginTop: '5%',
									}}
								>
									<path
										id='Path_172'
										data-name='Path 172'
										d='M9.632,8.186,16.07,1.748A1.024,1.024,0,1,0,14.622.3L8.185,6.738,1.747.3A1.024,1.024,0,1,0,.3,1.748L6.737,8.186.3,14.623A1.023,1.023,0,1,0,1.747,16.07L8.185,9.633l6.437,6.437a1.024,1.024,0,0,0,1.448-1.448Z'
										transform='translate(0 -0.001)'
										fill='#f90040'
									/>
								</svg>
							</span>
							<div className='text_button_house-phone-react'>Закрыть окно</div>
						</div>
					</div>
				</div>
			</Fragment>
		);
	})();
}

export default Error;
