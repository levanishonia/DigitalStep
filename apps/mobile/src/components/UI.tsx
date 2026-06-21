import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing } from '../theme/theme';

export function Screen({ children, title, subtitle, centered }: { children: ReactNode; title: string; subtitle?: string; centered?: boolean }) {
  return <ScrollView contentContainerStyle={[styles.screen, centered && styles.centered]} keyboardShouldPersistTaps="handled"><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}<View style={styles.stack}>{children}</View></ScrollView>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }
export function Button({ label, onPress, secondary, loading, disabled }: { label: string; onPress: () => void; secondary?: boolean; loading?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled || loading) && styles.buttonPressed]}>{loading ? <ActivityIndicator color={secondary ? colors.primary : '#fff'} /> : <Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text>}</Pressable>;
}
export function Field(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />; }
export function Row({ title, detail }: { title: string; detail?: string }) { return <Card><Text style={styles.rowTitle}>{title}</Text>{detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}</Card>; }
export function ErrorMessage({ message }: { message?: string }) { return message ? <Text style={styles.error}>{message}</Text> : null; }

const styles = StyleSheet.create({
  screen: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: 64 },
  centered: { justifyContent: 'center' },
  title: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: spacing.sm, lineHeight: 23 },
  stack: { gap: spacing.md, marginTop: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: spacing.md, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  button: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.md, alignItems: 'center', minHeight: 54, justifyContent: 'center' },
  buttonPressed: { opacity: 0.72 },
  secondaryButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryText: { color: colors.primaryDark },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: spacing.md, fontSize: 16, color: colors.text },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  rowDetail: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  error: { color: colors.danger, fontWeight: '600', lineHeight: 20 }
});
