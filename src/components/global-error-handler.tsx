"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorHandler extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });

        // Log to backend or analytics if needed
    }

    componentDidMount() {
        // Global error listeners for non-React errors
        window.onerror = (msg, url, lineNo, columnNo, error) => {
            console.error("Global error:", msg, url, lineNo, columnNo, error);
            // Optional: Update state to show UI even for non-React errors if desired
            // this.setState({ hasError: true, error: error as Error });
            return false;
        };

        window.onunhandledrejection = (event) => {
            console.error("Unhandled Rejection:", event.reason);
        };
    }

    handleReload = () => {
        window.location.reload();
    };

    handleCopyError = () => {
        const errorText = JSON.stringify({
            message: this.state.error?.message,
            stack: this.state.error?.stack,
            componentStack: this.state.errorInfo?.componentStack
        }, null, 2);
        navigator.clipboard.writeText(errorText);
        alert("Copied error details to clipboard");
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-4 text-center">
                    <div className="mb-4 rounded-full bg-red-100 p-4">
                        <AlertTriangle className="h-10 w-10 text-red-600" />
                    </div>
                    <h1 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong</h1>
                    <p className="mb-6 max-w-md text-gray-500">
                        We apologize for the inconvenience. An unexpected error occurred.
                    </p>

                    <div className="mb-6 w-full max-w-lg rounded-md bg-gray-900 p-4 text-left overflow-auto max-h-64">
                        <code className="text-xs text-red-400 font-mono block">
                            {this.state.error?.toString()}
                        </code>
                        {this.state.errorInfo && (
                            <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">
                                {this.state.errorInfo.componentStack}
                            </pre>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={this.handleReload} variant="default" className="gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            Reload Page
                        </Button>
                        <Button onClick={this.handleCopyError} variant="outline" className="gap-2">
                            <Copy className="h-4 w-4" />
                            Copy Error
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
