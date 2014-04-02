$(function () {
	if(!hash.get($('.sip-login').data('name'))) {

		$('.sip-login').val('storm2@crocodilertc.net');
	}
	if(!hash.get($('.sip-pswd').data('name'))) {

		$('.sip-pswd').val('12345');
	}
});
