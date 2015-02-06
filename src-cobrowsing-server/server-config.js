// Secure web socket server + https server config; by sergey.krasnikov@teligent.ru

var webSocketsConfig = {
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
  secret: '1234567890'
};

if(typeof module !== 'undefined' && module.exports) {
	module.exports.config = webSocketsConfig;
}
