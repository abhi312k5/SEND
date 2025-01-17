// JavaScript for encryption functionality using DES, Triple DES, and AES
const crypto = require('crypto');

// DES encryption for text
function encryptTextDES(text, password) {
    const key = crypto.scryptSync(password, 'salt', 8);
    const cipher = crypto.createCipheriv('des', key, Buffer.alloc(8));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// Triple DES encryption for images
function encryptImageTripleDES(imageData, password) {
    const key = crypto.scryptSync(password, 'salt', 24);
    const cipher = crypto.createCipheriv('des-ede3', key, Buffer.alloc(8));
    let encrypted = cipher.update(imageData, 'binary', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

// AES encryption for documents
function encryptDocumentAES(documentData, password) {
    const key = crypto.scryptSync(password, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(documentData, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted };
}

// Centralized download function
function downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event listeners for encryption buttons
document.getElementById('encryptButton').addEventListener('click', function() {
    const fileInput = document.getElementById('fileInput');
    const resultDiv = document.getElementById('result');

    if (fileInput.files.length === 0) {
        resultDiv.innerHTML = 'Please select a file to encrypt.';
        return;
    }

    const file = fileInput.files[0];
    const password = document.getElementById('passwordInput').value;

    if (!password) {
        resultDiv.innerHTML = 'Please enter a password.';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const fileData = e.target.result;
        let encryptedData;

        if (file.type.startsWith('image/')) {
            encryptedData = encryptImageTripleDES(fileData, password);
            downloadFile(encryptedData, `encrypted_${file.name}.img`);
        } else if (file.type.startsWith('application/')) {
            encryptedData = encryptDocumentAES(fileData, password);
            downloadFile(encryptedData.encryptedData, `encrypted_${file.name}.doc`);
        } else {
            encryptedData = encryptTextDES(fileData, password);
            downloadFile(encryptedData, `encrypted_${file.name}.txt`);
        }
    };

    reader.readAsBinaryString(file);
});
