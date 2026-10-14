import React, { memo } from 'react';
import styles from './index.module.css';
import band8 from '@imgs/captureScore/8.svg';
import band9 from '@imgs/captureScore/9.svg';
import band10 from '@imgs/captureScore/10.svg';
import band11 from '@imgs/captureScore/11.svg';
import { CAPTURE_COLORS, CAPTURE_NAMES, useCaptureScoreStore } from '../../store';

const BAND_IMAGES: Record<number, string> = {
	8: band8,
	9: band9,
	10: band10,
	11: band11,
};

function bandImage(id: number) {
	if (id < 8 || id > 11) return null;
	return BAND_IMAGES[id] || null;
}

function Teams() {
	const leftBandId = useCaptureScoreStore(state => state.leftBandId);
	const rightBandId = useCaptureScoreStore(state => state.rightBandId);
	const leftImg = bandImage(leftBandId);
	const rightImg = bandImage(rightBandId);

	return (
		<React.Fragment>
			{leftImg ? <img className={styles.logo} src={leftImg} alt="" /> : null}
			<span style={{ color: CAPTURE_COLORS[leftBandId] }}>{CAPTURE_NAMES[leftBandId]}</span>
			<span className={styles.vs}>vs.</span>
			<span style={{ color: CAPTURE_COLORS[rightBandId] }}>{CAPTURE_NAMES[rightBandId]}</span>
			{rightImg ? <img className={styles.logo} src={rightImg} alt="" /> : null}
		</React.Fragment>
	);
}

export default memo(Teams);
