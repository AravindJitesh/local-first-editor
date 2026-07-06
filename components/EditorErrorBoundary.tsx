'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class EditorErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Editor Error Boundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="border border-red-200 dark:border-red-900 rounded-lg p-6 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 min-h-[400px] flex flex-col items-center justify-center text-center gap-4">
          <h2 className="text-lg font-semibold">Something went wrong with the editor</h2>
          <p className="text-sm max-w-md">The editor encountered an unexpected error. Please refresh the page to try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition shadow"
          >
            Refresh Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
