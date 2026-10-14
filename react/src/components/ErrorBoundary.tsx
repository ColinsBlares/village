import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
    hasError: boolean;
}

interface ErrorBoundaryProps {
    children: ReactNode;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    componentDidCatch(error: Error) {
        this.setState({ hasError: true });
        mp.trigger('logger.debug', error.message.toString(), 'react');
    }

    render() {
        if (this.state.hasError) {
            return <h1>Error</h1>;
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
