import React, { createContext, useContext } from 'react';
import * as RN from 'react-native';
import { Ionicons as NativeIonicons } from '@expo/vector-icons';
import { LinearGradient as NativeLinearGradient } from 'expo-linear-gradient';

type Appearance = { theme: 'light' | 'dark'; fontScale: number };
const AppearanceContext = createContext<Appearance>({ theme: 'light', fontScale: 1 });
export const AppearanceProvider = AppearanceContext.Provider;

const darkColors: Record<string, string> = {
  '#241018': '#F7EDF2', '#705864': '#D4C0CA', '#A28D96': '#AA96A2',
  '#FFF8F8': '#180F18', '#FFFFFF': '#281A27', '#FFF': '#281A27', '#F8EFF2': '#332430', '#EADCE2': '#483440',
  '#F8E6EB': '#442331', '#F3E7EC': '#3B2638', '#E4F5EF': '#193D36', '#F8EEDC': '#453526',
  '#FFE9ED': '#442331', '#FBE8ED': '#442331', '#D8CFDA': '#594653',
  '#285F4E': '#A8E4CE', '#567D70': '#B4D9C8', '#4F7D6D': '#B4D9C8',
  '#8F6A21': '#E7CAA1', '#4E4560': '#E8D9EB', '#8D5963': '#E5BCC8', '#AE7B84': '#D5AAB5',
};

function adaptColor(value: unknown, property: string, dark: boolean) {
  if (!dark || typeof value !== 'string') return value;
  if (property === 'color' && (value.toUpperCase() === '#FFFFFF' || value.toUpperCase() === '#FFF')) return value;
  if (property === 'color') {
    const accentColors: Record<string, string> = {
      '#8E1838': '#F28BA7', '#651027': '#E6A0B2', '#6D2943': '#DEA3BD',
      '#2A0B17': '#F7EDF2',
      '#A62245': '#F29AB0', '#2F9F7D': '#80DCC0', '#C5913B': '#E9BB6B',
      '#9A7124': '#E9BB6B', '#896722': '#E9BB6B',
      '#285F4E': '#A8E4CE', '#567D70': '#B4D9C8', '#4F7D6D': '#B4D9C8',
    };
    if (accentColors[value.toUpperCase()]) return accentColors[value.toUpperCase()];
  }
  return darkColors[value] ?? darkColors[value.toUpperCase()] ?? value;
}

function adaptedStyle(style: any, appearance: Appearance, scaleText: boolean): any {
  if (!style) return style;
  if (Array.isArray(style)) return style.map((part) => adaptedStyle(part, appearance, scaleText));
  const flat = RN.StyleSheet.flatten(style);
  if (!flat || typeof flat !== 'object') return style;
  const result: Record<string, unknown> = { ...flat };
  for (const key of ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'shadowColor']) {
    if (key in result) result[key] = adaptColor(result[key], key, appearance.theme === 'dark');
  }
  if (scaleText) {
    if (typeof result.fontSize === 'number') result.fontSize = result.fontSize * appearance.fontScale;
    if (typeof result.lineHeight === 'number') result.lineHeight = result.lineHeight * appearance.fontScale;
  }
  return result;
}

function themed(Component: any, scaleText = false): any {
  return React.forwardRef((props: any, ref: any) => {
    const appearance = useContext(AppearanceContext);
    const style = adaptedStyle(props.style, appearance, scaleText);
    const placeholderTextColor = adaptColor(props.placeholderTextColor, 'color', appearance.theme === 'dark');
    return <Component {...props} ref={ref} style={style} placeholderTextColor={placeholderTextColor} />;
  });
}

export const View: typeof RN.View = themed(RN.View);
export const Text: typeof RN.Text = themed(RN.Text, true);
export const TextInput: typeof RN.TextInput = themed(RN.TextInput, true);
export const TouchableOpacity: typeof RN.TouchableOpacity = themed(RN.TouchableOpacity);
export const ScrollView: typeof RN.ScrollView = themed(RN.ScrollView);
export const KeyboardAvoidingView: typeof RN.KeyboardAvoidingView = themed(RN.KeyboardAvoidingView);
export const Pressable: typeof RN.Pressable = themed(RN.Pressable);
export const Ionicons: typeof NativeIonicons = ((props: React.ComponentProps<typeof NativeIonicons>) => {
  const appearance = useContext(AppearanceContext);
  return <NativeIonicons {...props} color={adaptColor(props.color, 'color', appearance.theme === 'dark') as string} />;
}) as unknown as typeof NativeIonicons;
export const LinearGradient: typeof NativeLinearGradient = ((props: React.ComponentProps<typeof NativeLinearGradient>) => {
  const appearance = useContext(AppearanceContext);
  const colors = appearance.theme === 'dark' ? props.colors.map((color) => adaptColor(color, 'backgroundColor', true) as string) : props.colors;
  return <NativeLinearGradient {...props} colors={colors as typeof props.colors} style={adaptedStyle(props.style, appearance, false)} />;
}) as unknown as typeof NativeLinearGradient;
