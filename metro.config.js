const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ativar suporte a Node.js globals se necessário para Firebase
config.resolver.sourceExts.push('mjs');

module.exports = config;
