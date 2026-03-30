/**
 * 🛡️ OWASP Utils for Mounjoy
 * Utilitários para Higienização e Segurança de Dados
 */

/**
 * Pillar 03: Injection
 * Sanitiza strings para remover caracteres que poderiam ser usados em ataques XSS.
 */
export const sanitizeInput = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .trim();
};

/**
 * Pillar 02: Cryptographic Failures
 * Garante que objetos sensíveis antes de irem para logs sejam mascarados.
 */
export const maskSensitiveData = (obj) => {
    const masked = { ...obj };
    const keysToMask = ['email', 'password', 'phone'];
    
    keysToMask.forEach(key => {
        if (masked[key]) masked[key] = '********';
    });
    
    return masked;
};
