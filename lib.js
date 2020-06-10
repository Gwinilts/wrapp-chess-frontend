window.defs = {
  brown_space: "#664846",
  clear_space: "#848587",
  suggestion: "#4287f5",
  rsc: {}
};

// for msg_types see ClientThread.h and chess.h

window.msg_type = {
  rsc: 0x11,
  begin: 0x12,
  confirm: 0x13,
  contest: 0x14,
  upoll: 0x15
};

window._msg_senders = {};

function addMsgSender(type, f) {
  _msg_senders[type] = f;
}

function sendMessage(type, data) {
  if (!_msg_senders.hasOwnProperty(type)) {
    console.log("could not find a way to send a message with type " + type);
    return;
  }

  if (!defs.ws.readyState == WebSocket.OPEN) {
    console.log("the websocket is not open, discarding message.");
    return;
  }

  var xdata = _msg_senders[type](type, data);
  defs.ws.send(xdata);

  //console.log("msg sent.");
}

window._raw_msg_handlers = {};
window._json_msg_handlers = {};

function addRawMsgHandler(type, f) {
  _raw_msg_handlers[type] = f;
}

function addJsonMsgHandler(type, f) {
  _json_msg_handlers[type] = f;
}

function _onMsg(e) {
  if (typeof(e.data) == "string") {
    var obj = JSON.parse(e.data);
    if (!obj.hasOwnProperty("type")) {
      console.log("discarding json msg with no type.");
      return;
    }

    if (!_json_msg_handlers.hasOwnProperty(obj.type)) {
      console.log("discarding json msg with unhandled type: " + obj.type);
      return;
    }

    _json_msg_handlers[obj.type](obj);
  } else {
    if (e.data instanceof Blob) {
      console.log("was a blob");
      e.data.arrayBuffer().then(buffer => _onMsg({data: buffer}));
      return;
    }

    console.log(e.data);
    var obj = new Uint8Array(e.data);

    if (!_raw_msg_handlers.hasOwnProperty(obj[0])) {
      console.log("discarding raw msg with unhandled type: " + obj[0]);
      return
    }

    _raw_msg_handlers[obj[0]](obj);
  }
}

HTMLElement.prototype.hide = function () {
  this.setAttribute("data-hidden", true);
}

HTMLElement.prototype.unhide = function () {
  this.removeAttribute("data-hidden");
}

class List {
  constructor(tgt) {
    this.tgt = tgt;
    var o = this;

    this.selected = null;

    this.tgt.addEventListener("click", function (e) {
      if (this == e.target) return;
      o.selected = e.target.dataId;
      o.tgt.querySelectorAll(".list-item").forEach(function (e) {
        e.removeAttribute("data-selected");
      });

      e.target.setAttribute("data-selected", true);
    });
  }

  addItem(id) {
    var item = _$("<div/>");
    item.setAttribute("class", "list-item");
    item.dataId = id;
    item.innerHTML = id;

    this.tgt.appendChild(item);
  }

  removeItem(id) {
    if (this.selected == id) this.selected = null;
    for (var c of this.tgt.children) {
      if (c.dataId == id) {
        this.tgt.removeChild(c);
        return;
      }
    }
  }

  sync(ids) {
    for (var c of this.tgt.children) {
      if (!ids.includes(c.dataId)) {
        this.tgt.removeChild(c);
        if (this.selected == c.dataId) this.selected = null;
      }
    }

    for (var id of ids) {
      if (!this.hasItem(id)) {
        this.addItem(id);
      }
    }
  }

  hasItem(id) {
    for (var c of this.tgt.children) {
      if (c.dataId == id) return true;
    }

    return false;
  }
}

function $(e) {
  return document.querySelectorAll(e);
}

function $$(e) {
  return document.getElementById(e);
}

function $$$(e) {
  return document.querySelector(e);
}

function _$(str) {
  var ex = document.createElement("div");

  ex.innerHTML = str;
  ex.normalize();

  var node;

  while (ex.firstChild) {
    node = ex.removeChild(ex.firstChild);

    if (node instanceof HTMLElement) return node;
  }
}

window._btn_handlers = {};

function _btn(e) {
  if (e.target != this) return;
  var it;

  if (!_btn_handlers.hasOwnProperty(this.id)) {
    console.log("did not find a btnHandler for " + this.id);
    return;
  }

  _btn_handlers[this.id].apply(this, e);
}

function addBtnHandler(id, f) {
  _btn_handlers[id] = f;
}

function _main() {
  console.log("ok");

  _setup();
}


function _setup() {
  document.querySelectorAll("[data-btn]").forEach(function (e) {
    if (e.id) {
      e.addEventListener("mouseup", _btn);
    } else {
      console.log("the following data-btn does not have an id and is ignored.");
      console.log(e);
    }
  });

  defs.ws = new WebSocket("ws://127.0.0.1:8080");

  defs.ws.addEventListener("message", _onMsg);
  defs.ws.addEventListener("open", main);
}

addMsgSender(msg_type.rsc, function (type, data) {
  var t = new TextEncoder();
  var mime = t.encode(data.mime + ";");
  var name = t.encode(data.name);

  var r_buf = new Uint8Array(1 + mime.length + name.length);
  r_buf[0] = type;

  for (var i = 0; i < mime.length; i++) {
    r_buf[i + 1] = mime[i];
  }

  for (var i = 0; i < name.length; i++) {
    r_buf[i + 1 + mime.length] = name[i];
  }

  return r_buf;
});

addMsgSender(msg_type.begin, function (type, data) {
  var t = new TextEncoder();

  var name = t.encode(data.name);

  var r_buf = new Uint8Array(1 + name.length);
  r_buf[0] = type;

  for (var i = 0; i < name.length; i++) {
    r_buf[i + 1] = name[i];
  }

  return r_buf;
});
