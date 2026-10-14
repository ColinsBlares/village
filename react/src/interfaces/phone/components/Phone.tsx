import React, { Fragment, useState, useRef } from 'react';
import '../phone.css';
import phoneBack from '@imgs/phone/new-back.png';
import MainDisplay from './MainDisplay';
import IncomingCall from './IncomingCall';
import ActiveCall from './ActiveCall';
import { usePhoneScreens, setAppDisplay } from '../navigation';
import { usePhoneStore, setIncomingCall } from '../store';

function Phone(ownProps) {
	const screens = usePhoneScreens(state => state.items);
	const phone = usePhoneStore();
	const props = {
		...ownProps,
		apps: screens,
		info: phone,
		setApp: setAppDisplay,
		setIncomingCall,
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
	return (() => {
		const { apps, setApp, info } = self.props;
		return (() => {
			return (
				<div>
					<Fragment>
						<div id='phone-form-react'>
							<img id='phone-background-react' src={phoneBack} />

							<div className='display-phone-react'>
								{apps.map((app, index) => (
									<Fragment key={index}>{app.form}</Fragment>
								))}
								{info.incomingCall && info.incomingCall.state && (
									<IncomingCall number={info.incomingCall.number} />
								)}
								{info.activeCall && info.activeCall.state && (
									<ActiveCall
										number={info.activeCall.number}
										isMine={info.activeCall.isMine}
									/>
								)}
							</div>

							<div className='panel_home-phone-react'>
								<button
									tabIndex={-1}
									id='but_home-phone-react'
									onClick={() =>
										setApp({
											name: 'MainDisplay',
											form: <MainDisplay />,
										})
									}
									disabled={info.isDisabled || info.isCall}
								></button>
							</div>
						</div>
					</Fragment>
				</div>
			);
		})();
	})();
}

export default Phone;
