function arrayBufferToBase64(buffer) {
    const binary = new Uint8Array(buffer);
    let base64 = '';
    for (let i = 0; i < binary.length; i++) {
        base64 += String.fromCharCode(binary[i]);
    }
    return window.btoa(base64);
}

function padPassword(password) {
    let paddedPassword = password;
    while (paddedPassword.length < 24) {
        paddedPassword += password;
    }
    return paddedPassword.slice(0, 24);
}

function showStatus(message, isError = false) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = 'status-message ' + (isError ? 'error' : 'success');
    statusElement.style.display = 'block';
    
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 3000);
}

function encryptButton() {
    const imageInput = document.getElementById('imageInput');
    const password = document.getElementById('passwordInput').value;
    const ciphertextOutput = document.getElementById('cipherTextOutput');

    if (!imageInput.files[0]) {
        showStatus('Please select an image file', true);
        return;
    }
    if (!password) {
        showStatus('Please enter a password', true);
        return;
    }

    if (imageInput.files[0].size > 15 * 1024 * 1024) {
        showStatus('File size too large. Please choose a file under 15MB', true);
        return;
    }

    showStatus('Encrypting image...');
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const base64Data = arrayBufferToBase64(event.target.result);
            
            const paddedPassword = padPassword(password);
            const key = CryptoJS.enc.Utf8.parse(paddedPassword);
            
            const wordArray = CryptoJS.enc.Base64.parse(base64Data);
            
            const encrypted = CryptoJS.TripleDES.encrypt(wordArray, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            
            ciphertextOutput.value = encrypted.toString();
            showStatus('Encryption completed successfully');
        } catch (error) {
            console.error('Encryption error:', error);
            showStatus('Encryption failed. Please try again', true);
        }
    };

    reader.onerror = function(error) {
        console.error('File reading error:', error);
        showStatus('Error reading file. Please try again', true);
    };

    reader.readAsArrayBuffer(imageInput.files[0]);
}

async function copyCipherText() {
    const ciphertextOutput = document.getElementById('cipherTextOutput');
    
    if (!ciphertextOutput.value) {
        showStatus('No text to copy', true);
        return;
    }

    try {
        await navigator.clipboard.writeText(ciphertextOutput.value);
        showStatus('Text copied to clipboard!');
    } catch (err) {
        try {
            const tempTextArea = document.createElement('textarea');
            tempTextArea.value = ciphertextOutput.value;
            document.body.appendChild(tempTextArea);
            
            tempTextArea.select();
            document.execCommand('copy');
            
            document.body.removeChild(tempTextArea);
            
            showStatus('Text copied to clipboard!');
        } catch (fallbackErr) {
            console.error('Failed to copy text:', fallbackErr);
            showStatus('Failed to copy text', true);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.querySelector('.custom-file-upload input[type="file"]');
    const imageInput = document.getElementById('imageInput');
    const imageNameOutput = document.getElementById('imageNameOutput');

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files[0]) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(this.files[0]);
                imageInput.files = dataTransfer.files;
                
                imageNameOutput.textContent = this.files[0].name;
            } else {
                imageNameOutput.textContent = '';
            }
        });
    }

    const encryptBtn = document.getElementById('encryptButton');
    if (encryptBtn) {
        encryptBtn.addEventListener('click', encryptButton);
    }

    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                encryptButton();
            }
        });
    }

    const cipherTextOutput = document.getElementById('cipherTextOutput');
    if (cipherTextOutput) {
        cipherTextOutput.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            e.target.value = text;
        });
    }

    const copyButton = document.querySelector('.copy-button');
    if (copyButton) {
        copyButton.addEventListener('click', copyCipherText);
    }
});

let isDecrypting = false;

function showError(message) {
    const errorElement = document.getElementById('errorMessage');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function setLoadingState(loading) {
    const button = document.getElementById('decryptButton');
    const spinner = document.getElementById('loadingSpinner');
    const buttonText = document.getElementById('decryptButtonText');
    
    isDecrypting = loading;
    button.disabled = loading;
    spinner.style.display = loading ? 'block' : 'none';
    buttonText.textContent = loading ? 'Decrypting...' : 'Decrypt';
}

function validateInput(cipherText, password) {
    if (!cipherText.trim()) {
        throw new Error('Please enter the encrypted cipher text');
    }
    if (!password.trim()) {
        throw new Error('Please enter the decryption password');
    }
}

async function decryptImage() {
    if (isDecrypting) return;

    const cipherText = document.getElementById('cipherTextInput').value;
    const password = document.getElementById('passwordInput').value;
    const decryptedImageContainer = document.getElementById('decryptedImageContainer');
    const downloadButton = document.getElementById('downloadButton');

    try {
        validateInput(cipherText, password);
        setLoadingState(true);

        const paddedPassword = padPassword(password);
        const key = CryptoJS.enc.Utf8.parse(paddedPassword);

        let cipherParams;
        try {
            const cipherBlob = CryptoJS.enc.Base64.parse(cipherText);
            cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: cipherBlob
            });
        } catch (e) {
            cipherParams = cipherText;
        }

        const decrypted = CryptoJS.TripleDES.decrypt(
            cipherParams,
            key,
            {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        let decryptedBase64;
        try {
            decryptedBase64 = decrypted.toString(CryptoJS.enc.Base64);
            if (!decryptedBase64) throw new Error('Empty result from Base64 conversion');
        } catch (e) {
            const words = decrypted.words;
            const sigBytes = decrypted.sigBytes;
            const bytes = new Uint8Array(sigBytes);
            
            for (let i = 0; i < sigBytes; i++) {
                const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
                bytes[i] = byte;
            }
            
            let binary = '';
            bytes.forEach(byte => {
                binary += String.fromCharCode(byte);
            });
            decryptedBase64 = window.btoa(binary);
        }

        if (!decryptedBase64) {
            throw new Error('Decryption produced no valid data');
        }

        const imageDataUrl = `data:image/png;base64,${decryptedBase64}`;
        const img = new Image();
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error('Decrypted data is not a valid image'));
            img.src = imageDataUrl;
        });

        document.getElementById('decryptedImage').src = imageDataUrl;
        decryptedImageContainer.style.display = 'block';
        downloadButton.href = imageDataUrl;
        downloadButton.style.display = 'inline-block';

    } catch (error) {
        console.error('Decryption error:', error);
        showError(error.message || 'Decryption failed. Please verify your inputs.');
        decryptedImageContainer.style.display = 'none';
        downloadButton.style.display = 'none';
    } finally {
        setLoadingState(false);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.querySelector('.custom-file-upload input[type="file"]');
    const imageInput = document.getElementById('imageInput');
    const imageNameOutput = document.getElementById('imageNameOutput');

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files[0]) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(this.files[0]);
                imageInput.files = dataTransfer.files;
                
                imageNameOutput.textContent = this.files[0].name;
            } else {
                imageNameOutput.textContent = '';
            }
        });
    }

    const encryptBtn = document.getElementById('encryptButton');
    if (encryptBtn) {
        encryptBtn.addEventListener('click', encryptButton);
    }

    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                decryptImage();
            }
        });
    }

    ['cipherTextInput', 'passwordInput'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                const errorMessage = document.getElementById('errorMessage');
                if (errorMessage) {
                    errorMessage.style.display = 'none';
                }
            });
        }
    });
});

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