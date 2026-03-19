import React from 'react';
import { Platform } from 'react-native';
import * as LucideNative from 'lucide-react-native';

export const Icon = ({ name, ...props }) => {
    const IconComponent = Platform.OS === 'web' ? null : LucideNative[name]; // Will only use Native in this file
    if (!IconComponent) return null;
    return <IconComponent {...props} />;
};
