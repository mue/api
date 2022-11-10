// import { Amo, ChromeWebStore } from 'webextension-store-meta';
// import extensions from './extensions';

// export const getVersions = async () => {
// 	const [edge, chrome, firefox] = await Promise.all([
// 		await (await fetch('https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/' + extensions.edge.split('//')[1])).json(),
// 		(await ChromeWebStore.load({
// 			id: extensions.chrome.split('//')[1],
// 			qs: { hl: 'en' },
// 		})).meta(),
// 		(await Amo.load({ id: extensions.firefox })).meta(),
// 	]);
// 	const edgeVersion = JSON.parse(edge.manifest).version;
// 	return  {
// 		chrome: chrome.version,
// 		edge: edgeVersion,
// 		firefox: firefox.version,
// 		whale: edgeVersion,
// 	};
// };