const KEY = 'abc123';
const SALT = 'def456';
const CDN_URL = 'https://cdn.muetab.com/img';
const BUCKET = 'muetab/api';

const crypto = require('crypto');

const id = '89c6225d79c00417';

const sign = target => {
	const hmac = crypto.createHmac('sha256', Buffer.from(KEY, 'hex'));
	hmac.update(Buffer.from(SALT, 'hex'));
	hmac.update(target);
	return hmac.digest('base64url');
};


// // not signed, no encoding
// const getURL = (id, options) => {
// 	const origin = `s3://${BUCKET}/${id}.jpg`;
// 	const path = options + 'plain' + '/' + origin;
// 	const final = CDN_URL + '/insecure' + path;
// 	return final;
// }

// // not signed, with encoding
// const getURL = (id, options) => {
// 	const origin = `s3://${BUCKET}/${id}.jpg`;
// 	const path = options + Buffer.from(origin).toString('base64url');
// 	const final = CDN_URL + '/insecure' + path;
// 	return final;
// };

// signed, with encoding
const getURL = (id, options) => {
	const origin = `s3://${BUCKET}/${id}.jpg`
	const path = options + Buffer.from(origin).toString('base64url');
	const signature = sign(path);
	const final = CDN_URL + '/' + signature  + path;
	return final;
}

console.log({
	original: getURL(id, '/'),
	qhd: getURL(id, '/pr:qhd/'),
	fhd: getURL(id, '/pr:fhd/'),
	hd: getURL(id, '/pr:hd/'),
});