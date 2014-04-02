window.oClient = window.oClient || (function ($) {
  
  if (!$) {
    return false;
  } else {
    /* Add  stringify */
    $.stringify = $.stringify || function (obj) {
      var t = typeof (obj);
      if (t != "object" || obj === null) {
        // simple data type
        if (t == "string") obj = '"'+obj+'"';
        return String (obj);
      } else {
        // recurse array or object
        var n, v, json = [], arr = (obj && obj.constructor == Array);
        for (n in obj) {
          v = obj[n]; t = typeof(v);
          if (t == "string") v = '"'+v+'"';
          else if (t == "object" && v !== null) v = JSON.stringify(v);
          json.push((arr ? "" : '"' + n + '":') + String(v));
        }
        return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
      }
    };
  }

  function APPLICATION () {
    
    var self = this;
    
    var minWidth = 550;
    var minHeight = 510;
    
    var ax,bx,cx,dx,identifier;
    
    /* Lang */
    self.lang = {
      balance: 'баланс',
      currency: 'руб'
    };
    
    /* UI objects */
    
    self.ui = {
      client: null
    };
    
    /* I */
    self.i = {
      
      nickname: null,
      name: 'Барак',
      family: 'Обама',
      gender: 0, /* 0 - male, 1 - female */
      number: '',
      balance: null,
      currency: 'rur'
    };
    
    /* Default */
    self.settings = {
      
      init: false,
      width: minWidth,
      height: minHeight,
      contacts: [],
      logo: 'images/icon-croco.jpg',
      icons: {
        male: 'images/icon-client-man.jpg',
        female: 'images/icon-client-woman.jpg',
        mic: 'images/icon-settings-mic.jpg',
        volume: 'images/icon-settings-volume.jpg',
      }
      
    };
    
    /* Private methods */

    function money (n) {
      
      if(!n) {
        return '--';
      }
      
      n = new String (n);
      var money = n.split ('.');
      var result = '';
      if (money.length == 1) {
        result = n + '.00';
      } else {
        if (money[1].length != 2) money[1] = money[1] + '0';
        result = money[0] + '.' + money[1];
      }
      return result;
    }
      
    function phone (n) {
      if(null == n) {
        return '<span class="red">(нет подключения к сети)</span>';
      }
      else if(n.match(/@/ || !n.match(/\d/))) {
        return n;
      }
      return new String (n).replace (/^(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/, '+$1 $2 $3 $4 $5');
    }
    
    /* public api Methods */

    self.fn = {
      
      getClientWidth: function () {return (document.compatMode == 'CSS1Compat' && !window.opera) ? document.documentElement.clientWidth : document.body.clientWidth;},
      getClientHeight: function () {return (document.compatMode == 'CSS1Compat' && !window.opera) ? document.documentElement.clientHeight : document.body.clientHeight;},
      getClientSTop: function () {return self.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || (document.body && document.body.scrollTop);},
      getClientSLeft: function () {return self.pageXOffset || (document.documentElement && document.documentElement.scrollLeft) || (document.body && document.body.scrollLeft);}
      
    };
    
    self.setMyNumber = function (number) {
      
      if(!number) {
        number = null;
      }
      self.i.number = number;
      if(self.ui.client) {
        self.ui.client.find ('.cfl .head .number .text').html (phone (self.i.number));
      }
    };
    
    self.setMyBalance = function (balance) {
      if(!balance) {
        balance = null;
      }

      self.i.balance = balance;
      
      if(self.ui.client) {
        self.ui.client.find ('.cfl .head .balance .text').html (new String (self.lang.balance).substr (0, 1).toUpperCase () + new String (self.lang.balance).substr (1) + ': <strong>' + money (self.i.balance) + '</strong> ' + self.lang.currency + '.');
      }
    };
    
    /* Initiation */
    $(function () {
      
      /* Local storage */
      
      if (localStorage) {
        
        var lsw = localStorage.getItem ('WIDTH');
        var lsh = localStorage.getItem ('HEIGHT');
        
        if (lsw && lsh) {
          
          try {
            self.settings.width = parseInt (lsw);
            self.settings.height = parseInt (lsh);
          } catch (isNoString) {
            self.settings.width = lsw;
            self.settings.height = lsh;
          }
          
          var lsc = localStorage.getItem ('CONTACTS');
          
          if (lsc) {
            
            self.settings.contacts = $.parseJSON (lsc);
            
            self.settings.init = true;
            
          }
          
        }
        
      }
      
      if (!self.settings.init) {
        
        if (localStorage) {
          
          /* TODO: get from server */
          
          localStorage.setItem ('WIDTH', self.settings.width);
          localStorage.setItem ('HEIGHT', self.settings.height);
          localStorage.setItem ('CONTACTS', $.stringify (self.settings.contacts));
          
          self.settings.init = true;
          
        }
        
      }
      
      function showTab (name, subname) {
        $('.tab').css ('display', 'none');
        $('.' + name).css ('display', 'block');
        if (subname) showSubTab (name, subname);
      }
      
      function showSubTab (parent, name) {
        $('.' + parent + ' .sub-tab').css ('display', 'none');
        $('.' + parent + ' .' + name).css ('display', 'block');
      }
      
      if (self.settings.width % 2) self.settings.width ++;
      
      if (self.settings.width < minWidth) self.settings.width = minWidth;
      if (self.settings.height < minHeight) self.settings.height = minHeight;
      
      var client = self.ui.client = $('#oclient');
      
      self.setMyNumber(null);
      
      client.css ( { width: (self.settings.width + 1) + 'px', height: self.settings.height + 'px', display: 'block' } );
      
      client.css ( { marginTop: parseInt ((self.fn.getClientHeight () - (self.settings.height + 2)) / 2) + 'px' } );
      
      client.find ('.cfl').css ( { width: (self.settings.width / 2) + 'px', height: self.settings.height + 'px' } );
      
      window.onresize = function () { client.css ( { marginTop: parseInt ((self.fn.getClientHeight () - (self.settings.height + 2)) / 2) + 'px' } ); };
      
      client.find ('.cfl .head .l img').attr ('src', self.settings.logo);

      self.setMyBalance(null);
      
      var contacts = client.find ('.contacts')[0], d = document;
      
      $(contacts).css ('height', self.settings.height - 128);
      
      function clist (a) {
        
        var contacts = client.find ('.contacts')[0], d = document;
        
        $(contacts).empty ();
        
        var div = d.createElement ('div');
        
        a = a.sort (function (x, y) {
          
          var xf = new String (x.family).substr (0, 1).toLowerCase ();
          var yf = new String (y.family).substr (0, 1).toLowerCase ();
          
          function getMyWeight (c) {
            
            var w;
            
            switch (c) {
              
              case '0' : w = 60; break; case '1' : w = 61; break; case '2' : w = 62; break; case '3' : w = 63; break; case '4' : w = 64; break;
              case '5' : w = 65; break; case '6' : w = 66; break; case '7' : w = 67; break; case '8' : w = 68; break; case '9' : w = 69; break;
              
              case 'a' : w = 1; break; case 'b' : w = 2; break; case 'c' : w = 3; break; case 'd' : w = 4; break; case 'e' : w = 5; break;
              case 'f' : w = 6; break; case 'g' : w = 7; break; case 'h' : w = 8; break; case 'i' : w = 9; break; case 'j' : w = 10; break;
              case 'k' : w = 11; break; case 'l' : w = 12; break; case 'm' : w = 13; break; case 'n' : w = 14; break; case 'o' : w = 15; break;
              case 'p' : w = 16; break; case 'q' : w = 17; break; case 'r' : w = 18; break; case 's' : w = 19; break; case 't' : w = 20; break;
              case 'u' : w = 21; break; case 'v' : w = 22; break; case 'w' : w = 23; break; case 'x' : w = 24; break; case 'y' : w = 25; break;
              case 'z' : w = 26; break;
              
              case 'а' : w = 27; break; case 'б' : w = 28; break; case 'в' : w = 29; break; case 'г' : w = 30; break; case 'д' : w = 31; break;
              case 'е' : w = 32; break; case 'ё' : w = 33; break; case 'ж' : w = 34; break; case 'з' : w = 35; break; case 'и' : w = 36; break;
              case 'й' : w = 37; break; case 'к' : w = 38; break; case 'л' : w = 39; break; case 'м' : w = 40; break; case 'н' : w = 41; break;
              case 'о' : w = 42; break; case 'п' : w = 43; break; case 'р' : w = 44; break; case 'с' : w = 45; break; case 'т' : w = 46; break;
              case 'у' : w = 47; break; case 'ф' : w = 48; break; case 'х' : w = 49; break; case 'ц' : w = 50; break; case 'ч' : w = 51; break;
              case 'ш' : w = 52; break; case 'щ' : w = 53; break; case 'ъ' : w = 54; break; case 'ы' : w = 55; break; case 'ь' : w = 56; break;
              case 'э' : w = 57; break; case 'ю' : w = 58; break; case 'я' : w = 59; break;
            }
            
            
            return w;
            
          }
          
          var xw = getMyWeight (xf);
          var yw = getMyWeight (yf);
          
          return yw - xw;
          
        } );
        
        $.each (a, function (i, v) {
          
          var contact = d.createElement ('button');
          var l = d.createElement ('div'); l.className = 'l';
          var r = d.createElement ('div'); r.className = 'r b2icon-chevron-right hide';
          var s = d.createElement ('span');
          
          $(s).html (v.name + ' ' + v.family);
          
          if (!v.gender) {
            $(l).css ('background-image', 'url(' + self.settings.icons.male + ')');
          } else {
            $(l).css ('background-image', 'url(' + self.settings.icons.female + ')');
          }
          
          if (typeof v.id != 'undefined') {
            contact.setAttribute ('data-id', v.id);
          } else {
            contact.setAttribute ('data-id', i);
          }
          
          $(contact).on ('click', function (event) {
            event.stopPropagation();
            
            var i = this.getAttribute ('data-id');
            
            identifier = i;
            
            var contact = self.settings.contacts[i];
            
            $('.tab').css ( { display: 'none' } );
            
            $(this).parent ().find ('button .r').removeClass ('show').addClass ('hide');
            $(this).find ('.r').removeClass ('hide').addClass ('show');
            
            $('.profile .head .l img').attr ('src', contact.photo?contact.photo:'images/contacts/nophoto.png');
            
            $('.profile .head .name .text').html ('<strong>' + contact.name + ' ' + contact.family + '</strong>');
            
            $('.profile .head .status .text').html ('<span class="icon icon-available"></span>абонент доступен');
            
            $('.profile ul .nickname').html (contact.nickname);
            $('.profile ul .family').html (contact.family);
            $('.profile ul .name').html (contact.name);
            $('.profile ul .phonen').html (phone (contact.number));
            
            $('.profile').css ( { display: 'block' } );
            
            return false;
            
          } );
          
          contact.appendChild (l);
          contact.appendChild (r);
          contact.appendChild (s);
          
          div.appendChild (contact);
          
        } );
        
        contacts.appendChild (div);
        
        if ($(div).height () > self.settings.height - 128) $(contacts).mCustomScrollbar ( { theme: 'light' } );
        
      }
      
      clist (self.settings.contacts);
      
      self.getCallNumber = function (callingObject) {
        
        var num = $('.phone .input-number').val();
        
        callingObject = $(callingObject);
        
        if(callingObject.closest('.profile').length) {
          num = callingObject.closest('.profile').first().find('.phonen').text();
        }
        
        if(!num.match(/@/)) {
          num = num+'@'+$('.edit-user .sip-login').val().replace(/^.*?@/, '');
        }
        console.log(num);
        return num;
      };
      
      self.isVideoCall = function (callingObject) {
        if($(callingObject).hasClass('start-call-video')) {
          return true;
        }
        return false;
      }
      
      $('.search input').on ('keyup', function () {
        
        var s = $('.search input').val ();
        
        var a = [];
        
        $.each (self.settings.contacts, function (i, v) {
          
          var n = new String (v.name);
          var f = new String (v.family);
          var p = new String (v.number);
          
          var r = new RegExp ('^(' + s + ')', 'i');
          
          var mn = n.match (r);
          var mf = f.match (r);
          var mp = p.match (r);
          
          if (mn || mf || mp) {
            
            var o = new Object ();
            
            o.nickname = v.nickname;
            o.gender = v.gender;
            o.number = v.number;
            o.photo = v.photo;
            
            if (!mp) {
              
              o.name = n.replace (r, '<strong class="red">$1</strong>');
              o.family = f.replace (r, '<strong class="red">$1</strong>');
              
            } else {
              
              o.name = n;
              o.family = f;
              
            }
            
            o.id = i;
            
            a[a.length] = o;
            
          }
          
        } );
        
        if (a.length) {
          
          clist (a);
          
        } else {
          
          /* Empty */
          clist (a);
          
        }
        
        return false;
      } );
      
      $('.phone .btn-groups button').on ('mousedown', function () {

        var selfbtn = $(this);
        
        $('.phone input').val ($('.phone input').val () + $(this).data('pri'));
        
        //timeout for replacing number with sub-character
        if(selfbtn.data ('sub')) {
          if(selfbtn.data('mouse-pressed-tid')) {
            clearTimeout(selfbtn.data('mouse-pressed-tid'));
          }
          selfbtn.data('mouse-pressed-tid', setTimeout(function () {
            
              var str = $('.phone input').val();
              str = str.substring(0, str.length - 1);
              $('.phone input').val (str + selfbtn.data ('sub'));
            
          }, 500));
        }

        return false;
        
      } );

      $('.phone .btn-groups button').on ('mouseup', function () {

        //cancel timeout for replacing number with sub-character
        if($(this).data('mouse-pressed-tid')) {
          clearTimeout($(this).data('mouse-pressed-tid'));
        }
        
        $('.phone input').trigger('change');

        return false;
        
      } );

      $('.phone button.delnum').on ('mousedown', function () {

        var selfbtn = $(this);

        $('.phone input').val ($('.phone input').val ().substr(0, $('.phone input').val ().length - 1));
        
        //timeout for deleting whole number
        if(selfbtn.data('mouse-pressed-tid')) {
          clearTimeout(selfbtn.data('mouse-pressed-tid'));
        }
        selfbtn.data('mouse-pressed-tid', setTimeout(function () {
            $('.phone input').val('');					
        }, 500));

        return false;
        
      });

      $('.phone button.delnum').on ('mouseup', function () {
        
        //cancel timeout for deleting whole number
        if($(this).data('mouse-pressed-tid')) {
          clearTimeout($(this).data('mouse-pressed-tid'));
        }
        
        $('.phone input').trigger('change');
        
        return false;
        
      });
      
      self.dialerPage = function () {
        
        identifier = false;
        
        showTab ('phone');
        
        return false;
        
      };
      
      $('button.call-number, .to-profile').on ('click', self.dialerPage );
      
      self.incomingCall = function (call) {
        
        if(!call) {
          call = {
            name: 'Неизвестный'
          };
        }
        
        if(call.video) {
          $('.incoming-call .caption .calltype').text('видео');
        }
        else {
          $('.incoming-call .caption .calltype').text('аудио');
        }
        
        $('.incoming-call .incoming-name').text(call.name);
        
        showTab ('incoming-call');

        return false;
      };
      
      self.setCallDuration = function (seconds) {
        //console.log('call duration: ', seconds);
        
        var text = seconds;
        
        if(parseInt(seconds)) {
          var minutes = Math.floor(parseInt(seconds)/60);
          seconds -= minutes*60;
          
          if(seconds < 10) {
            seconds = '0'+seconds;
          }
          
          text = minutes+':'+seconds;
        }
        
        if(!text) {
          text = '--:--';
        }
        
        $('.tab.cphone .timer, .tab.cvideo .timer').text(text);
      };
      
      self.makeCall = function (call) {
        
        if(!call) {
          call = {
            name: 'Неизвестный'
          };
          
          if($('.phone input').val ()) {
            call.name = $('.phone input').val ();
          }
        }
        
        //TODO: contact search by call.name
        
        var c;
        
        self.setCallDuration(false);
        
        if(call.video) {
          
          if (!identifier) {
            $('.cvideo .head .l').hide();
            
            $('.cvideo .head .name .text').html ('<strong>' + phone (call.name) + '</strong>');
          }
          else {
        
            c = self.settings.contacts[identifier];
              
            $('.cvideo .head .name .text').html ('<strong>' + c.name + ' ' + c.family + '</strong>');
            
            $('.cvideo .head .l img').attr ('src', c.photo?c.photo:'images/contacts/nophoto.png');
            
            $('.cvideo .status .text').html ('<span class="icon icon-busy"></span>абонент занят');
          }
          
          showTab ('cvideo');
        }
        else {
          
          if (!identifier) {
          
            $('.cphone .head .l,.cphone .name .fr,.cphone .status, .cphone .btn-success').css ('display', 'none');
            
            $('.cphone .head .name .text').html ('<strong>' + phone (call.name) + '</strong>');
          
          } else {
            
            c = self.settings.contacts[identifier];
            
            $('.cphone .head .name .text').html ('<strong>' + c.name + ' ' + c.family + '</strong>');
            
            $('.cphone .head .l img').attr ('src', c.photo?c.photo:'images/contacts/nophoto.png');
            
            $('.cphone .status .text').html ('<span class="icon icon-busy"></span>абонент занят');
            
            $('.cphone .head .l,.cphone .name .fr,.cphone .status, .cphone .btn-success').css ('display', 'block');
            
            
          }
          
          showTab('cphone');
        }
        
        
        
        return false;
        
      };
      
      $('.usereditor').on ('click', function () {
        
        $('.tab').css ( { display: 'none' } );
        
        //var c;
        //c = self.settings.contacts[identifier];
          
// 				$('.cvideo .head .name .text').html ('<strong>' + c.name + ' ' + c.family + '</strong>');
// 				
// 				$('.cvideo .head .l img').attr ('src', c.photo?c.photo:'images/contacts/nophoto.png');
// 				
// 				$('.cvideo .status .text').html ('<span class="icon icon-busy"></span>абонент занят');
        
        showTab('edit-user');
        
        return false;
        
      } );
      
      $('.slider').slider ( {
        
        min: 0,
        max: 100,
        value: 100,
        slide: function (event, ui) {
          
          ui.value = parseFloat(ui.value);
          
          $(this).parent ().parent ().find ('.value').html (ui.value + '%');
          
          var l = $(this).attr ('data-link'), p = ui.value / 100;
          
          switch (l) {
            
            case 'othvol' :

              $(this).closest('.tab').find('.dynamic-picture .opponent')[0].volume = p;

              break;
            
          }
          
        }
        
      } );
      
      $('.slider[data-link="mymic"]').slider('disable'); //FIXME: remove or reuse this slider
      
      $('.edit-user .returnto').on ('click', function () {
        showTab ('phone');
        return false;
      });
      
      /* Edit contact list */
      
        /* Add new user */
      
      $('button.add-new-user').on ('click', function () {
        
        showTab ('edit-contact-list', 'add-user');
        
        $('.edit-contact-list .add-user input.form-control')[0].value = '';
        $('.edit-contact-list .add-user input.form-control')[1].value = '';
        $('.edit-contact-list .add-user input.form-control')[2].value = '';
        $('.edit-contact-list .add-user input.form-control')[3].value = '';
        
        $('.edit-contact-list .add-user label')[0].className = 'btn btn-default active';
        $('.edit-contact-list .add-user label')[1].className = 'btn btn-default';
        
      } );
      
        /* Button  */
      
      $('.edit-contact-list .add-user button').on ('click', function () {
        
        var a = $('.edit-contact-list .add-user input.form-control')[0].value;
        var n = $('.edit-contact-list .add-user input.form-control')[1].value;
        var f = $('.edit-contact-list .add-user input.form-control')[2].value;
        var p = $('.edit-contact-list .add-user input.form-control')[3].value;
        
        var s = $('.edit-contact-list .add-user label')[0].className;
        
        if (s == 'btn btn-default active') {
          s = 0;
        } else {
          s = 1;
        }
        
        if (!a || !n || !f || !p) {
          
          alert ('Заполнены не все поля!');
          
        } else {
          
          var o = {
            
            nickname: a,
            name: n,
            family: f,
            gender: s,
            number: p,
            photo: 'images/contacts/nophoto.png'
            
          };
          
          self.settings.contacts.push (o);
          
          localStorage.setItem ('CONTACTS', $.stringify (self.settings.contacts));
          
          showTab ('phone');
          
          clist (self.settings.contacts);
          
        }
        
      } );
      
        /* Remove user */
      
      $('.profile button.delete-contact').on ('click', function () {
        
        if (confirm ('Вы уверены что хотите удалить этот контакт?')) {
          
          var contacts = [];
          
          $.each (self.settings.contacts, function (i, v) {
            
            if (i != identifier) {
              
              contacts.push (v);
              
            }
            
          } );
          
          self.settings.contacts = contacts;
          
          localStorage.setItem ('CONTACTS', $.stringify (self.settings.contacts));
          
          showTab ('phone');
          
          clist (self.settings.contacts);
          
        }
        
      } );
      
        /* Edit user */
      
      $('.profile button.edit-contact').on ('click', function () {
        
        showTab ('edit-contact-list', 'edit-user');
        
        var user = self.settings.contacts[identifier];
        
        $('.edit-contact-list .edit-user input.form-control')[0].value = user.nickname;
        $('.edit-contact-list .edit-user input.form-control')[1].value = user.name;
        $('.edit-contact-list .edit-user input.form-control')[2].value = user.family;
        $('.edit-contact-list .edit-user input.form-control')[3].value = user.number;
        
        if (user.gender) {
          
          $('.edit-contact-list .edit-user label')[0].className = 'btn btn-default';
          $('.edit-contact-list .edit-user label')[1].className = 'btn btn-default active';
          
        } else {
          
          $('.edit-contact-list .edit-user label')[1].className = 'btn btn-default';
          $('.edit-contact-list .edit-user label')[0].className = 'btn btn-default active';
          
        }
        
      } );
      
        /* Button */
      
      $('.edit-contact-list .edit-user button').on ('click', function () {
        
        var a = $('.edit-contact-list .edit-user input.form-control')[0].value;
        var n = $('.edit-contact-list .edit-user input.form-control')[1].value;
        var f = $('.edit-contact-list .edit-user input.form-control')[2].value;
        var p = $('.edit-contact-list .edit-user input.form-control')[3].value;
        
        var s = $('.edit-contact-list .edit-user label')[0].className;
        
        if (s == 'btn btn-default active') {
          s = 0;
        } else {
          s = 1;
        }
        
        if (!a || !n || !f || !p) {
          
          alert ('Заполнены не все поля!');
          
        } else {
          
          self.settings.contacts[identifier] = {
            
            nickname: a,
            name: n,
            family: f,
            gender: s,
            number: p,
            photo: self.settings.contacts[identifier].photo
            
          };
          
          localStorage.setItem ('CONTACTS', $.stringify (self.settings.contacts));
          
          showTab ('phone');
          
          clist (self.settings.contacts);
          
        }
        
      } );
      
        /* Clear contacts list*/
      
      $('.cfl .head .l img').on ('dblclick', function () {
        
        var size = prompt ('Укажите размеры окна!', self.settings.width + 'x' + self.settings.height);
        
        if (size.match (/^\d+x\d+$/)) {
          
          var s = size.split ('x');
          
          self.settings.width = s[0];
          self.settings.height = s[1];
          
          localStorage.setItem ('WIDTH', self.settings.width);
          localStorage.setItem ('HEIGHT', self.settings.height);
          
          if (!self.settings.contacts.length) {
            
            if (confirm ('Восстановить список контактов по умолчанию?')) {
              
              self.settings.contacts = self.settings.saver;
              
            }
            
          } else {
            
            if (confirm ('Очистить список контактов?')) {
              
              self.settings.contacts = [];
              
            }
            
          }
          
          localStorage.setItem ('CONTACTS', $.stringify (self.settings.contacts));
          
          showTab ('phone');
          
          clist (self.settings.contacts);
          
        }
        
      } );
      
      $('.myvideoshow .v-toggle').on('click', function (event) {
        var $this = $(this);
        var $vide = $('.dynamic-picture .me');
        if($this.hasClass('v-on')) {
          $vide.css('visibility', 'visible');
        } else {
          $vide.css('visibility', 'hidden');
        }
      });
      
    } );
    
  }
  
  return new APPLICATION ();

} ) (jQuery || false);
