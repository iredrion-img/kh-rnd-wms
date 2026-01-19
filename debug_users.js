
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, 'users.csv');

const readUsers = () => {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        const content = fs.readFileSync(USERS_FILE, 'utf8');
        console.log('Raw content snippet:', content.slice(0, 200));
        return parse(content, { columns: true, skip_empty_lines: true });
    } catch (e) {
        console.error(e);
        return [];
    }
};

const users = readUsers();
console.log('Parsed Users:', users);

const targetUser = users.find(u => u.name === '임문구');
if (targetUser) {
    console.log(`User found: ${targetUser.name}`);
    console.log(`Password: '${targetUser.password}'`);
    console.log(`Password length: ${targetUser.password.length}`);
    console.log(`Is password === '124830'? ${targetUser.password === '124830'}`);
} else {
    console.log('User not found');
}
