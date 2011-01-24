client = "UAcebook v0.4";

//myAlert("Setting stuff up", "UAcebook.js");
var currentFolderName = null;
var currentMessageFilter = "unread";
var currentMessageElement = null;
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

var foldersTimer = 0;

function showBanner() {
  sendGetRequest("/system", function(response) {
    $("#folder").html("<pre>\n" + response.banner + "\n</pre>");
  });
}

function showFolders(type) {
  //alert("Showing unread folders");
  sendGetRequest("/folders/" + type, function(response) {
    response.sort(function(a, b) {
      return a.folder == b.folder ? 0 : (a.folder > b.folder ? 1 : -1 );
    });

    var totalUnread = 0;
    var div = "";
    $.each(response, function(i, item) {
      var text = "<span id=\"folder-" + item.folder + "\">";
      text += item.folder;
      if(item.unread > 0) {
    	text += " (" + item.unread + " of " + item.count + ")"
      } else if(item.count > 0) {
      	text += " (" + item.count + ")"
      }
      text += "</span>";
      if(div.length > 0) {
    	div += "<br>\n";
      }
      //div += createLink("folder-" + item.folder, null, "showFolder('" + item.folder + "')", text);
      div += createLink(null, null, "showFolder('" + item.folder + "')", text);

      if(item.subscribed) {
        totalUnread += item.unread;
      }
    });
    $("#foldersList").html(div);
    
    $("#folder-" + currentFolderName).addClass("currentFolder");

    $("#totalUnread").html(totalUnread);

    var d = new Date();
    $("#lastRefresh").html(d.format('H:i'));
  });

  if(foldersTimer != 0) {
	clearTimeout(foldersTimer);
  }
  foldersTimer = setTimeout("showFolders('" + type + "')", 120000);
}

function showFolder(name) {
  sendGetRequest("/folder/" + name, function(response) {
	var filter = currentMessageFilter;
	
	if(currentFolderName != name) {
	  currentMessageElement = null;
	}
	
	$("#folder-" + currentFolderName).removeClass("currentFolder");
    currentFolderName = name;
	$("#folder-" + currentFolderName).addClass("currentFolder");

    if(filter == "unread") {
      // If there's no unread messages show them all instead
      filter = "all";
      $.each(response, function(i, item) {
        if(!item.read) {
          //myAlert("Triggering unread filter because " + item.id + " is unread", "showFolder");
          filter = "unread";
          return false;
        }
      });
    }
    
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
      if(filter == "all" || !item.read) {
        var d = new Date(1000 * item.epoch);

        var indentStr = "&nbsp;";
        indentStr = indentStr.repeat(indent);

        var text = "";

        text += getHtmlText(item.subject);
        text += " (" + item.id + " on " + d.format('D j/m');
        text += " from " + item.from + ")";

        if(first) {
          first = false;
        } else {
          div += "<br>";
        }

        div += indentStr + createLink("message-" + item.id, item.read ? "read" : "unread", "showMessage('" + item.id + "')", text) + "\n";

        div += "\n";
      }
    });

    $("#folder").html(div);

    $("#folderName").html(" in " + currentFolderName);

    var element = document.getElementById("folder");
    if(element != null) {
      element.scrollTop = 0;
    }
  });
  
  if(document.getElementById("currentMessageElement") != null) {
    $(currentMessageElement).addClass("currentMessage");
  } else {
    $("#messageheaders").html("<br>\n<br>");
    $("#messagebody").html("<br>\n<br>\n<br>\n<br>");
  }
}

function setMessageFilter(type) {
  currentMessageFilter = type;
  showFolder(currentFolderName);
}

function showMessage(id) {
  sendGetRequest("/message/" + id, function(response) {
    if(response.folder != currentFolderName) {
      showFolder(response.folder);
    }

    // Reset current indicator i.e. styles on links in the folder list
    
    $(currentMessageElement).removeClass("unread currentMessage");
    
    currentMessageElement = "#message-" + id;
    $(currentMessageElement).removeClass("unread");
    $(currentMessageElement).addClass("read currentMessage");

    var d = new Date(1000 * response.epoch);

    var div = "\n<b>" + response.id + "</b> in <b>" + response.folder + "</b>, " + d.format('H:i:s l jS F Y');
    div += getFieldStr("From", response.from);
    if(typeof(response.to) != "undefined") {
      div += getFieldStr("To", response.to);
    }
    div += getFieldStr("Subject", getHtmlText(response.subject));
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
