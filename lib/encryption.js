import CryptoJS from 'crypto-js';


// These keys should be stored in environment variables
const SECRET_KEY = "/sK:>}K=*NW*)NN46RW=?}KqS6J&s{K.";

export const encrypt = (data) => {
    try {
        const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
        const encrypted = CryptoJS.AES.encrypt(dataString, SECRET_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

export const hashPassword = (password, salt) => {
    return CryptoJS.SHA256(`${salt}:${password}`).toString();
};

export const decrypt = (encryptedData) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedString) {
            throw new Error('Decryption resulted in empty string');
        }

        try {
            return JSON.parse(decryptedString);
        } catch (e) {
            return decryptedString;
        }
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error(`Failed to decrypt data: ${error.message}`);
    }
};