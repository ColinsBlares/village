import React from 'react';

export function IconRecents() {
	return (
		<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
			<circle cx="11" cy="11" r="7.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
			<path d="M11 7.1V11l2.5 1.7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
		</svg>
	);
}

export function IconContacts() {
	return (
		<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
			<circle cx="11" cy="8" r="3.1" fill="currentColor" />
			<path d="M5.2 17.2c.7-2.6 2.9-4 5.8-4s5.1 1.4 5.8 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
		</svg>
	);
}

export function IconKeypad() {
	return (
		<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
			<circle cx="7" cy="6.5" r="1.35" fill="currentColor" />
			<circle cx="11" cy="6.5" r="1.35" fill="currentColor" />
			<circle cx="15" cy="6.5" r="1.35" fill="currentColor" />
			<circle cx="7" cy="11" r="1.35" fill="currentColor" />
			<circle cx="11" cy="11" r="1.35" fill="currentColor" />
			<circle cx="15" cy="11" r="1.35" fill="currentColor" />
			<circle cx="7" cy="15.5" r="1.35" fill="currentColor" />
			<circle cx="11" cy="15.5" r="1.35" fill="currentColor" />
			<circle cx="15" cy="15.5" r="1.35" fill="currentColor" />
		</svg>
	);
}

export function IconInfo() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
			<circle cx="10" cy="10" r="7.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
			<path d="M10 9.1V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
			<circle cx="10" cy="6.5" r="0.85" fill="currentColor" />
		</svg>
	);
}

export function IconDirection({ out }: { out?: boolean }) {
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
			<path
				d={out ? 'M2.2 9.6 9.2 2.6M4.4 2.6H9.2V7.4' : 'M9.8 2.4 2.8 9.4M7.6 9.4H2.8V4.6'}
				fill="none"
				stroke="currentColor"
				strokeWidth="1.4"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export function IconHandset() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="currentColor"
				d="M7.1 3.4c.4-.4 1-.5 1.5-.2l2 .9c.5.2.8.7.7 1.3l-.4 2.1c-.1.5-.4.9-.9 1l-1.1.3a11.2 11.2 0 0 0 6.3 6.3l.3-1.1c.1-.5.5-.8 1-.9l2.1-.4c.6-.1 1.1.2 1.3.7l.9 2c.3.5.2 1.1-.2 1.5l-1.2 1.2c-.4.4-1 .6-1.6.5-6.2-.9-10.8-5.5-11.7-11.7-.1-.6.1-1.2.5-1.6l1.5-1.5z"
			/>
		</svg>
	);
}

export function IconBackspace() {
	return (
		<svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true">
			<path d="M8 1.5h12.2A1.8 1.8 0 0 1 22 3.3v11.4a1.8 1.8 0 0 1-1.8 1.8H8L2.2 9 8 1.5z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
			<path d="M11 6.2 16.2 11.4M16.2 6.2 11 11.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
		</svg>
	);
}

export function IconPlus() {
	return (
		<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
			<path d="M10 3.5v13M3.5 10h13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	);
}

export function IconChevron() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M11.2 3.6 6 9l5.2 5.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}

export function IconMessage() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M3.2 4.2h11.6v7.4H7.2L4 14.2v-2.6H3.2V4.2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
		</svg>
	);
}

export function IconMail() {
	return (
		<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
			<path d="M3 5.2h12v8.2H3V5.2z" fill="none" stroke="currentColor" strokeWidth="1.4" />
			<path d="M3.4 5.6 9 10l5.6-4.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
		</svg>
	);
}

export function IconMic({ off }: { off?: boolean }) {
	return (
		<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
			<rect x="8" y="3" width="6" height="10" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
			<path d="M6.2 10.2a4.8 4.8 0 0 0 9.6 0M11 15v3.2M8.2 18.2h5.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
			{off ? <path d="M4 4.5 18 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /> : null}
		</svg>
	);
}

export function IconSpeaker({ on }: { on?: boolean }) {
	return (
		<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
			<path d="M4 8.2h2.6L11 5.2v11.6L6.6 13.8H4V8.2z" fill="currentColor" />
			{on ? (
				<path d="M13.4 8.1a3.6 3.6 0 0 1 0 5.8M15.4 6.2a6.2 6.2 0 0 1 0 9.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
			) : (
				<path d="M13.6 9.2a2.2 2.2 0 0 1 0 3.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
			)}
		</svg>
	);
}

export function IconPerson() {
	return (
		<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
			<circle cx="14" cy="10" r="4" fill="currentColor" />
			<path d="M6.5 22.5c1-3.6 3.8-5.4 7.5-5.4s6.5 1.8 7.5 5.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	);
}
