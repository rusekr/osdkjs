// Secure web socket server + https server config; by sergey.krasnikov@teligent.ru

var webSocketsConfig = {
	basicAuth: [
// 		{
// 			id: '',
// 			password: ''
// 		}
	],
//  basicAuthFile: './users.txt',
  basicAuthMysql: {
    host: 'osdp-teligent-dev-presencedb.virt.teligent.ru',
    user: 'kamailio',
    password: 'Cich5cieXo',
    query: 'SELECT `id` FROM `kamailio`.`subscriber` WHERE `username` = ? AND `domain` = ? AND `password` = ?;'
  },
	allowedOrigins: '*', // 'same', '*' on specify hostname
	listenerIPs: '*',
	port: 8443,
	clientTextMessageMaxChars: 20000,
	clientNameMaxChars: 50,
	clientNamePattern: 'a-z0-9_.-',
	cert: {
		key: '../cert/server.key',
		cert: '../cert/server.crt',
		ca: ['../cert/ca.pem', '../cert/ca2.pem'],
		pfx: '../cert/server.pfx'
	},
	contentTypesByExtension: {
		'.html': 'text/html',
		'.css':  'text/css',
		'.js':   'text/javascript',
		'.ico':  'image/vnd.microsoft.icon',
		'.png':  'image/png',
		'.gif':  'image/gif'
	}
};

if(typeof module !== 'undefined' && module.exports) {
	module.exports.config = webSocketsConfig;
}
