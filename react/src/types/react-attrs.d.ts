import 'react';

declare module 'react' {
    interface HTMLAttributes<T> {
        name?: string;
        rules?: string;
    }

    interface InputHTMLAttributes<T> {
        maxLength?: number | string;
    }
}
