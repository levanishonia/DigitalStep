import { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({ children, title, subtitle, centered, refreshing, onRefresh }: { children: ReactNode; title: string; subtitle?: string; centered?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
  return <ScrollView style={styles.scroll} contentContainerStyle={[styles.screen, centered && styles.centered]} keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}><View style={styles.webPreviewFrame}><View style={styles.brandRow}><View style={styles.logoMark}><Ionicons name="analytics" size={20} color="#fff" /></View><View><Text style={styles.brand}>DigitalStep</Text><Text style={styles.brandSubtitle}>Marketing Manager for Small Businesses</Text></View></View><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}<View style={styles.stack}>{children}</View></View></ScrollView>;
}
export function Card({ children, elevated }: { children: ReactNode; elevated?: boolean }) { return <View style={[styles.card, elevated && styles.elevated]}>{children}</View>; }
export function IconCircle({ name, color = colors.primary, background = colors.primarySoft, size = 18 }: { name: IconName; color?: string; background?: string; size?: number }) { return <View style={[styles.iconCircle, { backgroundColor: background }]}><Ionicons name={name} size={size} color={color} /></View>; }
export function Button({ label, onPress, secondary, loading, disabled, icon }: { label: string; onPress: () => void; secondary?: boolean; loading?: boolean; disabled?: boolean; icon?: IconName }) {
  return <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, (pressed || disabled || loading) && styles.buttonPressed]}>{loading ? <ActivityIndicator color={secondary ? colors.primary : '#fff'} /> : <View style={styles.buttonInner}>{icon ? <Ionicons name={icon} size={18} color={secondary ? colors.primaryDark : '#fff'} /> : null}<Text style={[styles.buttonText, secondary && styles.secondaryText]}>{label}</Text></View>}</Pressable>;
}
export function Field(props: TextInputProps) { return <TextInput placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline]} {...props} />; }
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }) { const palette = tone === 'success' ? [colors.success, colors.successSoft] : tone === 'warning' ? [colors.accent, colors.accentSoft] : tone === 'danger' ? [colors.danger, colors.dangerSoft] : tone === 'info' ? [colors.info, colors.infoSoft] : tone === 'purple' ? [colors.purple, colors.purpleSoft] : [colors.muted, colors.surface]; return <View style={[styles.badge, { backgroundColor: palette[1] }]}><Text style={[styles.badgeText, { color: palette[0] }]}>{label}</Text></View>; }
export function Row({ title, detail, icon = 'ellipse', right }: { title: string; detail?: string; icon?: IconName; right?: ReactNode }) { return <Card><View style={styles.row}><IconCircle name={icon} /><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text>{detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}</View>{right}</View></Card>; }
export function Skeleton() { return <Card><View style={styles.skeletonTitle} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '55%' }]} /></Card>; }
export function ErrorMessage({ message }: { message?: string }) { return message ? <Text style={styles.error}>{message}</Text> : null; }

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  screen: { flexGrow: 1, backgroundColor: colors.background, padding: spacing.md, paddingTop: 52, paddingBottom: 112, ...(Platform.OS === 'web' ? { alignItems: 'center' } : {}) },
  webPreviewFrame: { width: '100%', ...(Platform.OS === 'web' ? { maxWidth: 480 } : {}) },
  centered: { justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  logoMark: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
  brand: { color: colors.text, fontSize: 17, fontWeight: '900', letterSpacing: -0.2 },
  brandSubtitle: { color: colors.muted, fontSize: 12, marginTop: 1 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 15, marginTop: spacing.sm, lineHeight: 22 },
  stack: { gap: spacing.md, marginTop: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: spacing.md, shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  elevated: { shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 12 } },
  iconCircle: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: spacing.md, paddingVertical: 14, alignItems: 'center', minHeight: 52, justifyContent: 'center', shadowColor: colors.primaryDark, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } },
  buttonInner: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  secondaryButton: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, shadowOpacity: 0.03 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryText: { color: colors.primaryDark },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: spacing.md, fontSize: 16, color: colors.text },
  multiline: { minHeight: 92, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rowTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  rowDetail: { color: colors.muted, marginTop: 4, lineHeight: 20 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '900' },
  skeletonTitle: { width: '45%', height: 18, borderRadius: 9, backgroundColor: colors.surface, marginBottom: 12 },
  skeletonLine: { width: '85%', height: 12, borderRadius: 6, backgroundColor: colors.surface, marginTop: 8 },
  error: { color: colors.danger, fontWeight: '700', lineHeight: 20 }
});
