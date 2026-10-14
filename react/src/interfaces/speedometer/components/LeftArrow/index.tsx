import React, { memo } from 'react';
import styles from './index.module.css';
import { useSpeedometerStore } from '../../store';

const LEFT_PATH =
	'M10.6955 17.7064C10.8824 17.6414 11.0044 17.4898 11.0044 17.3215L11.0044 12.7572L23.5002 12.7572C23.7761 12.7572 24 12.5706 24 12.3407L24 5.6762C24 5.44628 23.7761 5.25966 23.5002 5.25966L11.0043 5.25966L11.0043 0.677874C11.0043 0.509609 10.8823 0.35798 10.6964 0.293002C10.5095 0.228844 10.2945 0.263832 10.1516 0.382972L0.146906 8.6927C0.0529514 8.77099 -4.6153e-05 8.87681 -4.61578e-05 8.9876C-4.61626e-05 9.09838 0.0529514 9.20421 0.145921 9.2825L10.1506 17.6164C10.2936 17.7355 10.5085 17.7713 10.6955 17.7064Z';

function LeftArrow() {
	const leftArrow = useSpeedometerStore(state => state.leftArrow);

	return (
		<div className={styles.leftArrow}>
			<svg className={leftArrow ? styles.green : undefined} viewBox="0 0 24 18" fill="none">
				<path d={LEFT_PATH} />
			</svg>
		</div>
	);
}

export default memo(LeftArrow);
