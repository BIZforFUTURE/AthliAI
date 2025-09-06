import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ErrorBoundaryState { hasError: boolean; errorMessage?: string }

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, errorMessage: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, info: unknown) {
    try {
      console.log('ErrorBoundary caught', { error, info });
    } catch {}
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="error-boundary-fallback">
          <Text style={styles.title}>Something went wrong</Text>
          {this.state.errorMessage ? (
            <Text style={styles.message} numberOfLines={3}>{this.state.errorMessage}</Text>
          ) : null}
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} testID="error-boundary-retry">
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0A0A0A' },
  title: { color: '#fff', fontSize: 20, fontWeight: '600' as const, marginBottom: 8 },
  message: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  button: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#007AFF', borderRadius: 10 },
  buttonText: { color: '#fff', fontWeight: '600' as const },
});

export default ErrorBoundary;
