window.game_msgs = {
  challange: 0xA1,
  accept: 0xA3,
  deny: 0xA4,
  init: 0xA5,
  draw: 0xA6,
  select: 0xA7,
  suggest: 0xA8
};

window.game_pieces = {
  pawn: 0x01,
  bishop: 0x02,
  knight: 0x03,
  rook: 0x04,
  king: 0x05,
  queen: 0x06
}

addMsgSender(game_msgs.challange, function (type, data) {
  var t = new TextEncoder();

  var tgt = t.encode(data.target);

  var r_buf = new Uint8Array(tgt.length + 1);
  r_buf[0] = type;

  for (var i = 0; i < tgt.length; i++) {
    r_buf[i + 1] = tgt[i];
  }
  return r_buf;
});

addMsgSender(game_msgs.select, function (type, data) {
  var r_buf = new Uint8Array(3);
  r_buf[0] = type;
  r_buf[1] = data.x;
  r_buf[2] = data.y;

  return r_buf;
});

addMsgSender(game_msgs.accept, function (type, data) {
  var r_buf = new Uint8Array(2);
  r_buf[0] = type;
  r_buf[1] = data ? 1 : 0;
  return r_buf;
})

addMsgSender(game_msgs.deny, function (type) {
  var r_buf = new Uint8Array(1);
  r_buf[0] = type;
  return r_buf;
});

addRawMsgHandler(game_msgs.suggest, function (data) {
  var get = function (x) {
    return {
      x: (x & 0x00F0) >> 4,
      y: 7 - (x & 0x000F)
    }
  }

  var obj;
  for (var i = 1; i < data.length; i++) {
    obj = get(data[i]);
    suggest(obj.x, obj.y);
  }
});

addRawMsgHandler(game_msgs.challange, function (data) {
  var name = new Uint8Array(data.length - 1);
  for (var i = 0; i < name.length; i++) {
    name[i] = data[i + 1];
  }

  var t = new TextDecoder();
  defs.challanger = t.decode(name);

  $$$(".lobby-section").hide();
  $$$(".waiting-section").unhide();

  $$$("#challanger").innerHTML = defs.challanger;
});

addRawMsgHandler(game_msgs.draw, function (data) {
  var count = data[1];
  var get = function (a, b) {
    return {
      x: (a & 0x00F0) >> 4,
      y: (a & 0x000F),
      color: (b & 0b0000000001000000) > 0,
      type: b & 0x000F
    };
  }

  var rsc = function (obj) {
    for (var i in game_pieces) {
      if (obj.type == game_pieces[i]) return i + (obj.color ? "_white" : "_black") + ".png";
    }
  }
  var obj, bobj;
  var white = count == 27;

  drawBoard(white);

  for (var i = 2; i < data.length; i += 2) {
    obj = get(data[i], data[i + 1]);
    drawPiece(obj.x, 7 - obj.y, defs.rsc[bobj = rsc(obj)]);
  }

});

addRawMsgHandler(game_msgs.init, function (data) {
  console.log("init!");
  defs.is_white = data[1] == 1;
  $$$(".lobby-section").hide();
  $$$(".waiting-section").hide();
  $$$(".board-section").unhide();
  drawBoard();
});

addBtnHandler("accept-game", function () {
  var obj;
  if (obj = $$$("[name=match-side]:checked")) {
    if (obj.value) {
      sendMessage(game_msgs.accept, obj.value == "white");
    }
  }
});

addBtnHandler("deny-game", function () {
  sendMessage(game_msgs.deny);
});

addJsonMsgHandler("rsc", function (obj) {
  console.log("a rsc has arrived.");
  var img = new Image();
  img.src = obj.data;

  defs.rsc[obj.name] = img;
});

addJsonMsgHandler("user-list", function (obj) {
  for (var i = 0; i < obj.data.length; i++) {
    if (obj.data[i] == defs.chosen_name) obj.data[i] += " (you)";
  }

  defs.user_list.sync(obj.data);
});

addMsgSender(msg_type.upoll, function (type) {
  var r_buf = new Uint8Array(1);
  r_buf[0] = type;

  return r_buf;
});

addRawMsgHandler(msg_type.confirm, function () {
  console.log("looks like the name is confirmed");

  $$$(".home-section").hide();
  $$$(".lobby-section").unhide();

  var u_poll = function () {
    sendMessage(msg_type.upoll);
  };

  defs.user_poll_interval = setInterval(u_poll, 2000);
  u_poll;
});

addRawMsgHandler(msg_type.contest, function () {
  console.log("looks like my name is already taken...");
  $$$("#user-name").value = "";
  $$$(".home-section .error").innerHTML = "Someone's already using that name. Please choose another.";
});

addBtnHandler("challange", function () {
  if (defs.user_list.selected == null) return;
  if (defs.user_list.selected.includes("(you)")) return;

  console.log(defs.chosen_name + " has challanged " + defs.user_list.selected);
  defs.challangee = defs.user_list.selected;
  sendMessage(game_msgs.challange, {
    target: defs.user_list.selected
  });
});

addBtnHandler("debug", function () {
  $$$(".home-section").hide();
  $$$(".waiting-section").unhide();
});

addBtnHandler("start-game", function (e) {
  var it = $$$("#user-name");
  var err = $$$(".home-section .error");

  if (it.value.length < 3 || it.value.length > 14) {
    err.innerHTML = "Your name must contain at least 3 characters and may contain no more than 14.";
    return;
  }

  if ((/[^a-zA-Z0-9_-]+/).test(it.value)) {
    err.innerHTML = "Your name must not contain spaces or special characters (except underscores '_' and dashes '-').";
    return;
  }

  err.innerHTML = "Hang on while i try and log you in...";

  defs.chosen_name = it.value;

  sendMessage(msg_type.begin, {
    name: it.value
  });
});

function openLobbyView() {

}

function touchUp(e) {
  if (this !== e.target) return false;

  var x = this.offsetLeft, y = this.offsetTop;

  var ref = this.offsetParent;

  while (ref) {
    x += ref.offsetLeft;
    y += ref.offsetTop;
    ref = ref.offsetParent;
  }

  x = e.pageX - x;
  y = e.pageY - y;

  x = (x - (x % defs.box)) / defs.box;
  y = 7 - (y - (y % defs.box)) / defs.box;

  console.log(x + ", " + y);

  sendMessage(game_msgs.select, {
    x: x,
    y: y
  });

}

function drawPiece(x, y, obj) {
  x *= defs.box;
  y *= defs.box;

  var ctx = defs.ctx;

  ctx.drawImage(obj, x, y, defs.box, defs.box);
}

function suggest(x, y) {
  x *= defs.box;
  y *= defs.box;

  var ctx = defs.ctx;

  ctx.strokeStyle = defs.suggestion;
  ctx.lineWidth = 3;

  ctx.strokeRect(x, y, defs.box, defs.box);
}

function wipeSquare(x, y, white) {
  var c, b;

  if (white) {
    c = defs.clear_space;
    b = defs.brown_space;
  } else {
    c = defs.brown_space;
    b = defs.clear_space;
  }

  if ((x + y) % 2 == 0) {
    defs.ctx.fillStyle = c;
  } else {
    defs.ctx.fillStyle = b;
  }

  x *= defs.box;
  y *= defs.box;

  defs.ctx.fillRect(x, y, defs.box, defs.box);
}

function drawBoard(white) {
  var ctx = defs.ctx;
  if (typeof(white) == "undefined") white = true;

  for (var x = 0; x < 8; x++) {
    for (var y = 0; y < 8; y++) {
      wipeSquare(x, y, white);
    }
  }
}

function main() {
  var canvas = defs.canvas = document.getElementById("chess-board");

  defs.user_list = new List($$$("#user-list"));

  defs.ctx = canvas.getContext("2d");
  canvas.width = canvas.height = defs.size = window.innerWidth;
  defs.box = window.innerWidth / 8;

  defs._mouse = canvas.addEventListener("mouseup", touchUp);
  defs._touch = canvas.addEventListener("touchup", touchUp);

  var types = "pawn bishop king queen rook knight".split(" ");

  console.log(defs.ws);

  for (var type of types) {
    console.log(type);
    sendMessage(msg_type.rsc, {
      name: type + "_white.png",
      mime: "image/png"
    });
    sendMessage(msg_type.rsc, {
      name: type + "_black.png",
      mime: "image/png"
    });
  }
}
