import selfsigned from 'selfsigned';

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

console.log('Keys returned:', Object.keys(pems));
console.log('Type of cert:', typeof pems.cert);
console.log('Type of private:', typeof pems.private);
