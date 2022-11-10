import ChromeWebStore from 'webextension-store-meta/lib/chrome-web-store';
import extensions from './extensions';

export const getStats = async () => {
	const round = n => Math.round(n / (10 ** (n.toString().length - 1))) * 10 ** (n.toString().length - 1);
	const headers = { 'User-Agent': 'mue' };
	const [repo, releases, edge, chrome] = await Promise.all([
		(await (await fetch('https://api.github.com/repos/mue/mue', { headers })).json()),
		(await (await fetch('https://api.github.com/repos/mue/mue/releases', { headers })).json()),
		(await (await fetch('https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/' + extensions.edge.split('//')[1])).json()),
		(await ChromeWebStore.load({
			id: extensions.chrome.split('//')[1],
			qs: { hl: 'en' },
		})).meta(),
	]);
	return {
		releases: round(releases.length),
		stars: round(repo.stargazers_count),
		users: round(chrome.users + edge.activeInstallCount),
	};
};