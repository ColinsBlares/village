import React, { memo } from 'react';
import styles from './index.module.css';
import { ChangelistState, likeCurrent, useChangelistStore } from '../../store';

function selectLikes(state: ChangelistState) {
	const entry = state.list[state.i];
	return entry ? entry.likes : 0;
}

function selectLiked(state: ChangelistState) {
	const entry = state.list[state.i];
	return entry ? entry.liked : false;
}

function Likes() {
	const enable = useChangelistStore(state => state.enable);
	const likes = useChangelistStore(selectLikes);
	const liked = useChangelistStore(selectLiked);
	const className = liked ? styles.likes + ' ' + styles.liked : styles.likes;

	return (
		<div
			className={className}
			style={{ display: enable ? '' : 'none' }}
			onClick={likeCurrent}
		>
			{likes} <i className="fas fa-heart" />
		</div>
	);
}

export default memo(Likes);
