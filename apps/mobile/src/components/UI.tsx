import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, spacing } from '../theme/theme';

export function Screen({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return <View style={styles.screen}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}<View style={styles.stack}>{children}</View></View>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }
export function Button({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.button, secondary && styles.secondaryButton]}><Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></Pressable>;
}
export function Field(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />; }
export function Row({ title, detail }: { title: string; detail?: string }) { return <Card><Text style={styles.rowTitle}>{title}</Text>{detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}</Card>; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: 64 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: { color: colors.muted, fontSize: 16, marginTop: spacing.sm, lineHeight: 22 },
  stack: { gap: spacing.md, marginTop: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  button: { backgroundColor: colors.primary, borderRadius: 16, padding: spacing.md, alignItems: 'center' },
  secondaryButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryText: { color: colors.primaryDark },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: spacing.md, fontSize: 16 },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 16 },
  rowDetail: { color: colors.muted, marginTop: 6, lineHeight: 20 }
});
