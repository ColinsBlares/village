import React, { memo } from 'react';
import styles from './index.module.css';
import { usePlayerMenuStore } from '../../store';
import Character from '../Character';
import Sidebar from '../Sidebar';
import Report from '../Report';
import Help from '../Help';
import Reference from '../Reference';

function Pane(props: { id: string; children: React.ReactNode }) {
	const active = usePlayerMenuStore(state => state.windowId === props.id);
	const className = active ? styles.pane : styles.paneHidden;
	return <div className={className}>{props.children}</div>;
}

const PaneView = memo(Pane);

function Body() {
	const longName = usePlayerMenuStore(state => state.longName);
	const className = longName ? styles.body + ' ' + styles.longName : styles.body;

	return (
		<div className={className}>
			<PaneView id="character">
				<Character />
			</PaneView>
			<PaneView id="settings">
				<Sidebar kind="settings" />
			</PaneView>
			<PaneView id="report">
				<Report />
			</PaneView>
			<PaneView id="help">
				<Help />
			</PaneView>
			<PaneView id="reference">
				<Reference />
			</PaneView>
			<PaneView id="donate">
				<Sidebar kind="donate" />
			</PaneView>
		</div>
	);
}

export default memo(Body);
