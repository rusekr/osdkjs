// Initialization of the group of tabs that contain the tutorial and its functional parts: html, css and js
function initTabs() {
  if ($) {
    $('div.tabs-content div.tab').hide();
    $('div.tabs-content div.tab-tutorial').show();
    $('ul.nav-tabs li a').on('click', function() {
      $('ul.nav-tabs li').attr('class', 'passive');
      $(this).parent().attr('class', 'active');
      $('div.tabs-content div.tab').hide();
      $('div.tabs-content div.' + $(this).attr('href').substr(1)).show();
      return false;
    });
  }
}

// Initialization and stylization of blocks that contain code examples of the tutorial
function initCodeBlocks() {
  if ($) {
    var colors = {
      html: {

      },
      css: {

      },
      js: {

      }
    };
    $.each($('div.pre'), function(index, general) {
      var type = general.getAttribute('rel');
      if (!type || (type != 'html' && type != 'css' && type != 'js')) {
        $(general).hide();
      } else {
        var content = $(general).html();
        $(general).empty();
        var div = document.createElement('div');
        var head = document.createElement('div'); head.className = 'head'; head.innerHTML = 'block ' + type.toUpperCase();
        var line = document.createElement('div'); line.className = 'line';
        var code = document.createElement('div'); code.className = 'code';
        var lines = $.trim(content).split("\n");
        if (!lines.length) {
          $(general).hide();
        } else {
          var i, len, lineContent = '', codeContent = '';
          len = lines.length;
          for (i = 0; i != len; i ++) {
            if (i) lineContent += "\r\n";
            lineContent += i + 1;
          }
          line.innerHTML = lineContent;
          var firstLine = content.split("\n")[1];
          len = firstLine.length;
          for (i = 0; i != len; i ++) {
            if (firstLine.substr(i, 1).charCodeAt(0) != 32) break;
          }
          var tabCount = i;
          for (i = 0; i != lines.length; i ++) {
            var l = lines[i];
            if (i) {
              codeContent += "\r\n";
              l = l.substr(tabCount);
            }
            switch(type) {
              case 'html' :
                if (l.match(/<\!--/)) {
                  l = "[color:95F279]" + l + "[/color]";
                  break;
                }
                l = l.replace(/<(input|button|textarea|select)(\s?[^<>]*)>/ig, '[color:F1DA36]&lt;$1$2&gt;[/color]');
                l = l.replace(/<\/(input|button|textarea|select)>/ig, '[color:F1DA36]&lt;/$1&gt;[/color]');
                l = l.replace(/<(video|audio)(\s?[^<>]*)>/ig, '[color:BFA3E0]&lt;$1$2&gt;[/color]');
                l = l.replace(/<\/(video|audio)>/ig, '[color:BFA3E0]&lt;/$1&gt;[/color]');
                l = l.replace(/<(a)(\s?[^<>]*)>/ig, '[color:4DBC2B]&lt;$1$2&gt;[/color]');
                l = l.replace(/<\/(a)>/ig, '[color:4DBC2B]&lt;/$1&gt;[/color]');
                // l = l.replace(/<span\sclass=\"glyphicon\s([-a-z0-9]+)\"><\/span>/ig, '[symbol:$1]');
                l = l.replace(/<(span)(\s?[^<>]*)>/ig, '[color:8DBFE0]&lt;$1$2&gt;[/color]');
                l = l.replace(/<\/(span)>/ig, '[color:8DBFE0]&lt;/$1&gt;[/color]');
                l = l.replace(/<(style)(\s?[^<>]*)>/ig, '[color:9E78BF]&lt;$1$2&gt;[/color]');
                l = l.replace(/<\/(style)>/ig, '[color:9E78BF]&lt;/$1&gt;[/color]');
                l = l.replace(/<(script)(\s?[^<>]*)>/ig, '[color:C15757]&lt;$1$2&gt;[/color]');
                l = l.replace(/<\/(script)>/ig, '[color:C15757]&lt;/$1&gt;[/color]');
                l = l.replace(/\[script:source\]/ig, "[color:C15757]&lt;script type=\"text/javascript\" src=\"libraries/osdkjs.js\"&gt;[/color][color:C15757]&lt;/script&gt;[/color]");
                l = l.replace(/id=\"([-a-zA-Z0-9_]+)\"/ig, 'id="[color:DD3E3E]$1[/color]"');
                l = l.replace(/(href|src)=\"([^\"]+)\"/ig, '$1="[color:ffffff]$2[/color]"');
                break;
              case 'css' :
                if (l.match(/\/\*/) || l.match(/\*\//)) {
                  l = "[color:EFCB88]" + l + "[/color]";
                  break;
                }
                l = l.replace(/\[style\]/ig, "[color:9E78BF]&lt;style type=\"text/css\"&gt;[/color]");
                l = l.replace(/\[\/style\]/ig, "[color:9E78BF]&lt;/style&gt;[/color]");
                l = l.replace(/([-a-z0-9]+):([-a-z0-9\s#\"]+);/ig, '[b]$1[/b]:[i]$2[/i];');
                l = l.replace(/^([^\{\}]+)([\{|\}]{1})/ig, '[color:F1DA36]$1[/color]$2');
                l = l.replace(/(\.|#){1}([-a-z0-9]+)/ig, '$1[b]$2[/b]');
                break;
              case 'js' :
                if (l.match(/\/\//)) {
                  l = "[color:EFCB88]" + l + "[/color]";
                  break;
                }
                l = l.replace(/(\d+)/ig, '[color:7DD17D]$1[/color]');
                l = l.replace(/\[script\]/ig, "[color:C15757]&lt;script type=\"text/javascript\"&gt;[/color]");
                l = l.replace(/\[\/script\]/ig, "[color:C15757]&lt;/script&gt;[/color]");
                l = l.replace(/oSDK(\(|\.)/ig, '[color:7CE28C][b]oSDK[/b][/color]$1');
                l = l.replace(/\$/ig, '[color:BF9AED]$[/color]');
                l = l.replace(/(function|var|if|else|switch|case|break|continue|for|return|new|null|void|undefined|typeof)/ig, '[b]$1[/b]');
                l = l.replace(/(true|false)/ig, '[color:6ED8DD]$1[/color]');
                l = l.replace(/(true|false)/ig, '[color:6ED8DD]$1[/color]');
                l = l.replace(/(\'|\"){1}([^\'\"]*)(\'|\"){1}/ig, '[color:D66B6B]$1$2$3[/color]');
                l = l.replace(/([a-z0-9_]+)\(/ig, '[color:92C1E5]$1[/color](');
                break;
            }
            l = l.replace(/</ig, "&lt;");
            l = l.replace(/>/ig, "&gt;");
            l = l.replace(/\[color:([a-z0-9]+)\]/ig, '<span style="color:#$1;">');
            l = l.replace(/\[\/color\]/ig, '</span>');
            l = l.replace(/\[b\]/ig, '<strong>');
            l = l.replace(/\[\/b\]/ig, '</strong>');
            l = l.replace(/\[i\]/ig, '<i>');
            l = l.replace(/\[\/i\]/ig, '</i>');
            l = l.replace(/\[symbol:([-a-z0-9]+)\]/ig, '<span class="glyphicon $1"></span>');
            codeContent += l;
          }
          code.innerHTML = codeContent;
          general.appendChild(head);
          div.appendChild(line);
          div.appendChild(code);
          general.appendChild(div);
        }
      }
    });
  }
}