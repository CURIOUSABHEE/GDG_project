import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure icons directory exists
const iconsDir = path.join(__dirname, 'dist', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Simple blue 1x1 pixel PNG
const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(base64Png, 'base64');

try {
    fs.writeFileSync(path.join(iconsDir, 'icon16.png'), buffer);
    fs.writeFileSync(path.join(iconsDir, 'icon48.png'), buffer);
    fs.writeFileSync(path.join(iconsDir, 'icon128.png'), buffer);
    console.log('All icons created successfully.');
} catch (e) {
    console.error('Error creating icons:', e);
}
