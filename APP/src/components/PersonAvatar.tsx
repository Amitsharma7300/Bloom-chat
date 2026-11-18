import React from 'react';
import { Image, type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';
import { avatarFor } from '../lib/avatars';
import type { Gender } from '../types/chat';

interface Props {
  avatar?: string | null;
  gender: Gender;
  style?: StyleProp<ImageStyle>;
  blurRadius?: number;
}

const portraitSources: Record<Gender, ImageSourcePropType[]> = {
  Woman: [require('../../assets/images/avatar-woman.png'), require('../../assets/images/avatar-woman-2.png')],
  Man: [require('../../assets/images/avatar-man.png'), require('../../assets/images/avatar-man-2.png')],
  Other: [require('../../assets/images/avatar-other.png')],
};

export default function PersonAvatar({ avatar, gender, style, blurRadius }: Props) {
  const preferred = avatarFor(gender, avatar);
  const variant = preferred.endsWith('/1') ? 1 : 0;
  return <Image source={portraitSources[gender][variant] ?? portraitSources[gender][0]} style={style} blurRadius={blurRadius} resizeMode="cover" />;
}
