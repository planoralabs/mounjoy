const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ativar suporte a Node.js globals se necessário para Firebase
config.resolver.sourceExts.push('mjs');

// landing/ é um projeto Vite separado (landing page de marketing), com seu
// próprio node_modules — o Metro não deve enxergá-lo.
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const landingDir = escapeRegExp(path.join(__dirname, 'landing') + path.sep);
config.resolver.blockList = new RegExp(`^${landingDir}.*`);

module.exports = config;
