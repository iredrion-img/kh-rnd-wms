import selfsigned from 'selfsigned';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const generate = async () => {
    // Helper to get local IP
    const getLocalIP = () => {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return '127.0.0.1';
    };
    const localIP = getLocalIP();

    try {
        const attrs = [{ name: 'commonName', value: 'b2b-solution' }]; // Generic Name
        console.log(`Generating SSL for IPs: 127.0.0.1, ${localIP}, 192.168.0.60`);

        // selfsigned.generate returns a Promise in newer versions
        const pems = await selfsigned.generate(attrs, {
            days: 3650, // 10 years
            keySize: 2048,
            extensions: [{
                name: 'subjectAltName',
                altNames: [
                    { type: 2, value: 'localhost' },
                    { type: 2, value: 'kh-rnd' },
                    { type: 2, value: 'kh-rnd.local' },
                    { type: 7, ip: '127.0.0.1' }, // Localhost IP
                    { type: 7, ip: localIP },       // Detected LAN IP
                    { type: 7, ip: '192.168.0.60' } // Explicit Fixed IP
                ]
            }, {
                name: 'basicConstraints',
                cA: true // Critical for trusting as Root CA
            }]
        });

        fs.writeFileSync(path.join(projectRoot, 'cert.pem'), pems.cert);
        fs.writeFileSync(path.join(projectRoot, 'key.pem'), pems.private);

        console.log('SSL Certificates generated successfully: cert.pem, key.pem');
    } catch (error) {
        console.error('Failed to generate certificates:', error);
        process.exit(1);
    }
};

generate();
