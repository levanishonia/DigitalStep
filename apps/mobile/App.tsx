import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/auth/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/theme';
import { AppNavigator } from './src/navigation/AppNavigator';

function ThemedApp() {
  const { isDark, colors } = useTheme();
  return (
    <NavigationContainer theme={{ dark: isDark, colors: { primary: colors.primary, background: colors.background, card: colors.card, text: colors.text, border: colors.border, notification: colors.primary } }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
