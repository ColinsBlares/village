import React, { memo, useEffect, useState } from 'react';
import ramka from '@imgs/phone/ramka.png';
import styles from './index.module.css';
import { usePhoneOsStore } from '../../store';
import Wallpaper from '../Wallpaper';
import StatusBar from '../StatusBar';
import LockScreen from '../LockScreen';
import HomeScreen from '../HomeScreen';
import AppPage from '../AppPage';
import HomeBar from '../HomeBar';
import Switcher from '../Switcher';
import Shade from '../Shade';
import Banner from '../Banner';
import CallPeek from '../CallPeek';

function useFitScale() {
	const [scale, setScale] = useState(1);

	useEffect(function () {
		function fit() {
			const byHeight = (window.innerHeight * 0.75) / 639;
			const byWidth = (window.innerWidth * 0.48) / 315;
			setScale(Math.min(byHeight, byWidth));
		}

		fit();
		window.addEventListener('resize', fit);
		return function () {
			window.removeEventListener('resize', fit);
		};
	}, []);

	return scale;
}

function Stage({ children }: { children: React.ReactNode }) {
	const shade = usePhoneOsStore(state => state.shade);
	const drag = usePhoneOsStore(state => state.shadeDrag);
	const switcher = usePhoneOsStore(state => state.switcher);
	const pull = switcher ? 1 : shade;
	const motion = drag ? 'none' : 'transform 0.46s cubic-bezier(0.22, 1, 0.36, 1), border-radius 0.46s cubic-bezier(0.22, 1, 0.36, 1)';

	return (
		<div
			className={styles.stage}
			style={{
				transform: pull ? 'translateY(' + pull * 18 + 'px) scale(' + (1 - pull * 0.06) + ')' : 'none',
				borderRadius: 36 * pull + 'px',
				transition: motion,
			}}
		>
			{children}
		</div>
	);
}

const StageView = memo(Stage);

function AppSlot() {
	const switcher = usePhoneOsStore(state => state.switcher);
	if (switcher) {
		return null;
	}
	return <AppPage />;
}

const AppSlotView = memo(AppSlot);

function BarSlot({ appsHome }: { appsHome: boolean }) {
	const switcher = usePhoneOsStore(state => state.switcher);
	if (appsHome && !switcher) {
		return null;
	}
	return <HomeBar />;
}

const BarSlotView = memo(BarSlot);

function Device() {
	const phase = usePhoneOsStore(state => state.phase);
	const appId = usePhoneOsStore(state => state.appId);
	const face = usePhoneOsStore(state => state.face);
	const peek = face === 'peek' || face === 'call';
	const showLock =
		!peek && (phase === 'lock' || phase === 'unlocking' || phase === 'locking');
	const showHome =
		!peek && (phase === 'home' || phase === 'unlocking' || phase === 'locking');
	const appsHome = phase === 'home' && !appId;

	return (
		<div className={styles.device}>
			<div className={styles.screen}>
				<StageView>
					<Wallpaper />
					{showLock ? <LockScreen /> : null}
					{showHome ? <HomeScreen /> : null}
					{peek ? null : <AppSlotView />}
				</StageView>
				{peek ? null : <Shade />}
				{face === 'call' ? <CallPeek /> : <Banner />}
				{peek ? null : <Switcher />}
				<StatusBar />
				{peek ? null : <BarSlotView appsHome={appsHome} />}
			</div>
			<img className={styles.frame} src={ramka} alt='' draggable={false} />
		</div>
	);
}

const DeviceView = memo(Device);

function PhoneOs() {
	const shell = usePhoneOsStore(state => state.shell);
	const face = usePhoneOsStore(state => state.face);
	const scale = useFitScale();
	const [pose, setPose] = useState<'off' | 'in' | 'peek' | 'call'>('off');

	useEffect(function () {
		if (shell === 'in') {
			const frame = requestAnimationFrame(function () {
				setPose('in');
			});
			return function () {
				cancelAnimationFrame(frame);
			};
		}
		if (shell === 'peek') {
			const frame = requestAnimationFrame(function () {
				setPose(face === 'call' ? 'call' : 'peek');
			});
			return function () {
				cancelAnimationFrame(frame);
			};
		}
		setPose('off');
	}, [shell, face]);

	if (shell === 'off') {
		return null;
	}

	return (
		<div
			className={styles.anchor}
			style={{ transform: 'scale(' + scale + ')' }}
		>
			<div className={styles.slide} data-pose={pose}>
				<DeviceView />
			</div>
		</div>
	);
}

export default memo(PhoneOs);
