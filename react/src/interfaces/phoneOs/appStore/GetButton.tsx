import React, { memo } from 'react';
import { catalog } from '../grid';
import { usePhoneOsStore } from '../store';
import { openInstalled, startDownload, useStoreApp } from './store';
import styles from './index.module.css';

function Ring({ value }: { value: number }) {
	const radius = 8;
	const length = 2 * Math.PI * radius;
	return (
		<svg className={styles.ring} width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
			<circle cx="11" cy="11" r={radius} fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="2.2" />
			<circle
				cx="11"
				cy="11"
				r={radius}
				fill="none"
				stroke="currentColor"
				strokeWidth="2.2"
				strokeLinecap="round"
				strokeDasharray={length}
				strokeDashoffset={length * (1 - value / 100)}
				transform="rotate(-90 11 11)"
			/>
		</svg>
	);
}

function GetButton({ appKey, appId }: { appKey: string; appId: string }) {
	const progress = useStoreApp(state => state.progress[appKey]);
	const installed = usePhoneOsStore(function (state) {
		if (state.dock.indexOf(appKey) >= 0) {
			return true;
		}
		return state.home.some(function (place) {
			const piece = catalog[place.key];
			return place.key === appKey || (!!piece && piece.id === appId);
		});
	});

	function onClick(event: React.MouseEvent) {
		event.stopPropagation();
		if (installed) {
			openInstalled(appId);
			return;
		}
		if (progress == null) {
			startDownload(appKey);
		}
	}

	return (
		<button type="button" className={styles.get + (progress != null ? ' ' + styles.busy : '')} onClick={onClick}>
			{progress != null ? <Ring value={progress} /> : installed ? 'ОТКРЫТЬ' : 'ЗАГРУЗИТЬ'}
		</button>
	);
}

export default memo(GetButton);
