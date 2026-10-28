import React, { memo } from 'react';
import { avatarColor, initials } from './data';
import styles from './index.module.css';

function Avatar({ name, size }: { name: string; size: number }) {
	return (
		<span
			className={styles.avatar}
			style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
		>
			<span style={{ background: avatarColor(name) }}>{initials(name)}</span>
		</span>
	);
}

export default memo(Avatar);
