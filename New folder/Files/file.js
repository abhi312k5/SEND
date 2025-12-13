
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function bufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunks = [];
    const chunkSize = 0x8000;
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        chunks.push(String.fromCharCode.apply(null, chunk));
    }
    
    return btoa(chunks.join(''));
}

function base64ToBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
}

async function generateKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveBits", "deriveKey"]
    );
    
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("SEND-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function encryptFile(file, password) {
    if (!file || !password) {
        throw new Error("File and password are required");
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`);
    }

    const key = await generateKey(password);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const fileData = await file.arrayBuffer();
    
    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        fileData
    );
    
    const encryptedFile = {
        iv: bufferToBase64(iv),
        content: bufferToBase64(encryptedContent),
        filename: file.name,
        type: file.type
    };
    
    return JSON.stringify(encryptedFile);
}

async function decryptFile(encryptedData, password) {
    if (!encryptedData || !password) {
        throw new Error("Encrypted data and password are required");
    }

    try {
        const encryptedFile = JSON.parse(encryptedData);
        const key = await generateKey(password);
        
        const decryptedContent = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: base64ToBuffer(encryptedFile.iv)
            },
            key,
            base64ToBuffer(encryptedFile.content)
        );
        
        return new File([decryptedContent], encryptedFile.filename, { type: encryptedFile.type });
    } catch (error) {
        throw new Error("Decryption failed. Please check your password.");
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const fileInfo = document.getElementById('fileInfo');
    
    if (!fileInfo) return;
    
    const fileName = fileInfo.querySelector('.file-name');
    const fileSize = fileInfo.querySelector('.file-size');

    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`File is too large. Maximum size allowed is ${formatFileSize(MAX_FILE_SIZE)}`);
            event.target.value = '';
            fileInfo.style.display = 'none';
            return;
        }

        fileName.textContent = file.name;
        fileSize.textContent = 'Size: ' + formatFileSize(file.size);
        fileInfo.style.display = 'block';
    } else {
        fileInfo.style.display = 'none';
    }
}

async function encryptButton() {
    const fileInput = document.querySelector('.title');
    const passwordInput = document.getElementById('passwordInput');
    const file = fileInput.files[0];
    const password = passwordInput.value;

    if (!file || !password) {
        alert('Please select a file and enter a password');
        return;
    }

    const button = document.getElementById('encryptButton');
    const originalText = button.textContent;
    button.textContent = 'Encrypting...';
    button.disabled = true;

    try {
        const encryptedData = await encryptFile(file, password);
        const resultContainer = document.getElementById('cipherTextOutput');
        resultContainer.value = encryptedData;
    } catch (error) {
        alert('Encryption failed: ' + error.message);
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

async function decryptButtonNew() {
    const cipherInput = document.getElementById('cipherInput');
    const passwordInput = document.getElementById('passwordInput');
    const encryptedText = cipherInput.value;
    const password = passwordInput.value;

    if (!encryptedText || !password) {
        alert('Please enter both encrypted text and password');
        return;
    }

    const button = document.getElementById('decryptButton');
    const originalText = button.textContent;
    button.textContent = 'Decrypting...';
    button.disabled = true;

    try {
        const decryptedFile = await decryptFile(encryptedText, password);
        const downloadUrl = URL.createObjectURL(decryptedFile);
        
        const resultContainer = document.getElementById('resultContainer');
        resultContainer.innerHTML = `
            <a href="${downloadUrl}" download="${decryptedFile.name}" style="text-decoration: none;">
                <button style="padding: 8px 16px; border-radius: 20px; background: linear-gradient(45deg, #007bff, #00bfff); color: white; border: none; cursor: pointer;">
                    Download Decrypted File
                </button>
            </a>
        `;
    } catch (error) {
        alert(error.message);
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

function copyCipherText() {
    const textarea = document.getElementById('cipherTextOutput');
    textarea.select();
    document.execCommand('copy');
    alert('Encrypted text copied to clipboard!');
}

window.handleFileSelect = handleFileSelect;
window.encryptButton = encryptButton;
window.decryptButtonNew = decryptButtonNew;
window.copyCipherText = copyCipherText;