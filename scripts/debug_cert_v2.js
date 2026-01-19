import * as selfsigned from 'selfsigned';
console.log('Imported:', selfsigned);
try {
    const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 365 });
    console.log('Generated:', pems);
} catch (e) {
    console.error('Error:', e);
}
