import React, { Fragment, useState, useRef } from 'react';
import HeadAppPhone from './HeadAppPhone';
import warning from '@imgs/phone/warning.svg';
import { closeAppDisplay } from '../navigation';

function EmergencyCall(ownProps) {
	const props = { ...ownProps, closeApp: closeAppDisplay };
	const [state, setReactState] = useState(() => ({
		message: '',
	}));

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

	self.handleChangeMessage = e => {
		const { message } = self.state;
		setState({
			message: e.target.value,
			isError: false,
		});
	};

	self.sendMessage = type => {
		const { closeApp } = self.props;
		const { message } = self.state;

		if (message) {
			setState({
				isError: false,
			});

			if (type == 'pd') {
				mp.trigger('callRemote', 'mapCase.pd.calls.add', message);
			} else if (type == 'ems') {
				mp.trigger('callRemote', 'mapCase.ems.calls.add', message);
			}

			closeApp();
		} else {
			setState({
				isError: true,
			});
		}
	};

	return (() => {
		const { closeApp } = self.props;
		const { message, isError } = self.state;
		return (
			<Fragment>
				<div className='back_page-phone-react'>
					<HeadAppPhone title='Экстренный вызов' />

					<div
						style={{
							textAlign: 'center',
							marginTop: '25%',
						}}
					>
						<img
							style={{
								width: '20%',
							}}
							src={warning}
						/>
						<div
							style={{
								marginTop: '5%',
							}}
						>
							Выберите службу для вызова из списка
						</div>
					</div>

					<h2
						style={{
							color: '#343c47',
							textAlign: 'center',
							fontSize: '100%',
						}}
					>
						Причина вызова
					</h2>
					<div
						style={{
							textAlign: 'center',
						}}
					>
						<textarea
							style={{
								border: isError ? '1px solid red' : '1px solid #343c47',
							}}
							className='news_input'
							placeholder={
								isError ? 'Вы не ввели причину!' : 'Введите причину...'
							}
							maxLength={60}
							rows={3}
							value={message}
							onChange={self.handleChangeMessage}
						></textarea>
					</div>
					<span
						style={{
							marginLeft: '5%',
						}}
					>
						{60 - message.length}/60 символов
					</span>

					<div
						className='house_buttons-phone-react'
						style={{
							bottom: '2%',
							position: 'absolute',
						}}
					>
						<div
							className='house_button-phone-react'
							onClick={() => self.sendMessage('pd')}
						>
							<div>PD</div>
						</div>
						<div
							className='house_button-phone-react'
							onClick={() => self.sendMessage('ems')}
						>
							<div>EMS</div>
						</div>
					</div>
				</div>
			</Fragment>
		);
	})();
}

export default EmergencyCall;
