import { Component, ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Still a class component in 2026, and that's the point of the question.
 *
 * There is no hook equivalent of componentDidCatch. If an interviewer asks
 * "how do you handle a render error", the honest answer is: hooks can't, you
 * need a class — or a library like react-error-boundary, which is a class
 * under the hood.
 *
 * What it does NOT catch (all four are worth naming):
 *   - errors inside event handlers   → try/catch
 *   - errors in async code           → .catch()
 *   - errors during SSR
 *   - errors thrown by the boundary itself
 *
 * Wrap a screen, not the whole app, so one bad screen doesn't blank everything.
 */

type Props = {
  children: ReactNode;
  /** Custom UI. Receives the error and a function to clear it and re-render. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
};

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  /** Render phase: derive the fallback UI. Must be pure — no side effects. */
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  /** Commit phase: this is where logging goes (Sentry, Crashlytics). */
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>{error.message}</Text>
        <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button">
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  message: { textAlign: 'center', marginBottom: 16, opacity: 0.7 },
  button: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#3478f6' },
  buttonLabel: { color: 'white', fontWeight: '600' },
});
