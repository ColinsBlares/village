/// <reference types="vite/client" />

interface RageMp {
    trigger(eventName: string, ...args: any[]): void;
    event: GameEvents;
}

interface GameEvents {
    on(eventName: string, handler: (...args: any[]) => void): void;
    call(eventName: string, ...args: any[]): void;
    remove(eventName: string, handler: (...args: any[]) => void): void;
}

declare const mp: RageMp;

declare module '*.module.css' {
	const classes: { readonly [key: string]: string };
	export default classes;
}

declare module '*.css';

declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}
