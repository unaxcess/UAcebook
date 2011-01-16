client = "UAcebook v0.3";

var currentFolderName = null;
var currentFolderFilter = "unread";
var currentMessageId = null;
var currentUser = null;

function createLink(id, style, url, text) {
  var href = "\"#\" onclick=\"" + url + ";return false\"";
  if(id != null) {
    id = " id=\"" + id + "\"";
  } else {
    id = "";
  }
  if(style != null) {
    style = " class=\"" + style + "\"";
  } else {
    style = "";
  }
  var link = "<a " + id + " " + style + " href=" + href + ">" + text + "</a>";
  //myAlert("Link: " + link, "createLink");
  return link;
}

function getFieldStr(name, value) {
  return "<br>\n" + name + ": <b>" + value + "</b>";
}

function setElementClass(elementName, className) {
  var element = document.getElementById(elementName);
  if(element != null) {
    element.className = className;
  }
}

function setElementReverseVideo(elementName) {
  var element = document.getElementById(elementName);
  if(element != null) {
    var fgcol = element.style.color;
    var bgcol = element.style.backgroundColor;
	//myAlert("Switching colours " + fgcol + " and " + bgcol, "setElementReverseVideo");
    element.style.color = bgcol;
    element.style.backgroundColor = fgcol;
  }
}

var foldersTimer = 0;

function showFolders(type) {
  //alert("Showing unread folders");
  sendGetRequest("/folders/" + type, function(response) {
    response.sort(function(a, b) {
      return a.folder == b.folder ? 0 : (a.folder > b.folder ? 1 : -1 );
    });

    var totalUnread = 0;
    var div = "";
    $.each(response, function(i, item) {
      var text = item.folder;
      if(item.unread > 0) {
    	text += " (" + item.unread + " of " + item.count + ")"
      } else if(item.count > 0) {
      	text += " (" + item.count + ")"
      }
      if(div.length > 0) {
    	div += "<br>\n";
      }
      div += createLink("folder-" + item.folder, null, "showFolder('" + item.folder + "')", text);
      
      if(item.subscribed) {
        totalUnread += item.unread;
      }
    });
    $("#folders").html(div);

    $("#totalunread").html(totalUnread);

    var d = new Date();
    $("#lastRefresh").html(d.format('H:i'));
  });

  if(foldersTimer != 0) {
	clearTimeout(foldersTimer);
  }
  foldersTimer = setTimeout("showFolders('" + type + "')", 30000);
}

function showFolder(name) {
  sendGetRequest("/folder/" + name, function(response) {
    if(currentFolderName != null) {
      setElementClass("folder-" + currentFolderName, null);
    }
    currentFolderName = name;
    setElementClass("folder-" + currentFolderName, "current");

    var div = "";

    var indents = new HashMap();
    var first = true;
    $.each(response, function(i, item) {
      var indent = 0;
      if(typeof(item.inReplyTo) != "undefined") {
        indent = indents.get(item.inReplyTo);
        indent++;
      }
      indents.put(item.id, indent);

      //myJSONAlert("Message", item, "showFolder");
      if(currentFolderFilter != "unread" || !item.read) {
        var d = new Date(1000 * item.epoch);

        var text = "&nbsp;";
        text = text.repeat(indent);
        text += getHtmlText(item.subject);
        text += " (" + item.id + " on " + d.format('D j/m');
        text += " from " + item.from + ")";

        if(first) {
          first = false;
        } else {
          div += "<br>";
        }

        div += createLink("message-" + item.id, item.read ? "read" : "unread", "showMessage('" + item.id + "')", text) + "\n";
      }
    });

    $("#folder").html(div);
    
    var element = document.getElementById("folder");
    if(element != null) {
      element.scrollTop = 0;
    }
  });
}

function setFolderFilter(type) {
  currentFolderFilter = type;
  showFolder(currentFolderName);
}

function showMessage(id) {
  sendGetRequest("/message/" + id, function(response) {
    if(currentMessageId != null) {
      setElementReverseVideo("message-" + currentMessageId);
    }
    currentMessageId = id;

    // Mark message response in folder list as read
    setElementClass("message-" + currentMessageId, "read");
    setElementReverseVideo("message-" + currentMessageId);

    var d = new Date(1000 * response.epoch);

    var div = "\n<b>" + response.id + "</b> in <b>" + response.folder + "</b>, " + d.format('H:i:s l jS F Y');
    div += getFieldStr("Subject", response.subject);
    div += getFieldStr("From", response.from);
    if(typeof(response.to) != "undefined") {
      div += getFieldStr("To", response.to);
    }
    if(typeof(response.inReplyTo) != "undefined") {
      div += getFieldStr("In-Reply-To", createLink(null, "messagelink", "showMessage('" + response.inReplyTo + "')", response.inReplyTo));
    }
    div += "\n";
    $("#messageheaders").html(div);

    var div = "\n" + getHtmlText(response.body) + "\n";

    $("#messagebody").html(div);
    
    var request = new Array();
    request[0] = parseInt(id);
    sendPostRequest("/message/read", request, function(response) {
    });
    
    if(response.folder != currentFolderName) {
      showFolder(response.folder);
    }
  });
}

function postMessage(folder, to, subject, inReplyTo, body) {
  myAlert("Posting in " + folder + " to " + to + " about " + subject + " in reply to " + inReplyTo + " saying " + body, "postMessage");
  
  var command = "folder";
  
  var request = new Object();
  
  if(folder != null) {
    command += "/" + folder;
  }
  if(to != null) {
	  request.to = to;
  }
  request.subject = subject;
  if(inReplyTo != null) {
    command = "message";
    request.inReplyTo = inReplyTo;
  }
  request.body = body;
  
  sendPostRequest("/" + command, request, function(response) {
    myJSONAlert("Message reply", response, "postMessage");
  }, true);
}

function showUsername() {
  if(currentUser == null) {
    sendGetRequest("/user", function(response) {
      currentUser = response;
      //myJSONAlert("Current user retrieved", currentUser, "showUsername");
      $("#username").html(currentUser.name);
    });
  }
}
