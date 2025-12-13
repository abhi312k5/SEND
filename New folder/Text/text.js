function encryptTextDES(text, password) {
    const key = CryptoJS.enc.Utf8.parse(password);
    const encrypted = CryptoJS.DES.encrypt(text, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

function decryptTextDES(encryptedText, password) {
    const key = CryptoJS.enc.Utf8.parse(password);
    const decrypted = CryptoJS.DES.decrypt(encryptedText, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

window.encryptTextDES = encryptTextDES;
window.decryptTextDES = decryptTextDES;