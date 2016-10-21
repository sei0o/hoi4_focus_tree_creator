var focuses = [
];

var Creator = function(focuses, editorElm, focusesElm, treeElm, pointerElm, addFocusFormElm, copyResultElm, resultElm) {
  this.focuses = focuses;
  this.editorElm = editorElm;
  this.focusesElm = focusesElm;
  this.treeElm = treeElm;
  this.pointerElm = pointerElm;
  this.addFocusFormElm = addFocusFormElm;
  this.resultElm = resultElm;
  this.mouseOffsetX = 0;
  this.mouseOffsetY = 0
  this.GRID = 80;

  var self = this;
  this.clipboard = new Clipboard(copyResultElm, {
    text: function(trigger) {
      alert("copied!");
      return self.generate(); // コードを生成
    }
  });

  this.setUp();
};

Creator.prototype = {
  setUp: function() {
    var self = this;

    for (var i = 0; i < this.focuses.length; i++) {
      this.addFocusElm(this.focuses[i], i);
    }

    this.treeElm.addEventListener("drop", function(e){ self.onDrop(e); }, false);
    this.treeElm.addEventListener("dragover", function(e){ self.onDragOver(e); }, false);

    this.focusesElm.addEventListener("drop", function(e){ self.onDropOnFocuses(e); }, false);
    this.focusesElm.addEventListener("dragover", function(e){ self.onDragOverFocuses(e); }, false);

    this.addFocusFormElm.addEventListener("keypress", function(e){ self.onKeyPress(e); }, false);
  },

  importFocuses: function(code) {
    var focusCodes = code.split(/focus\s\=\s{/);
    let focuses = [];

    for (let focusCode of focusCodes) {
      let idMatch = focusCode.match(/\s+id\s=\s(.+)\n/i);

      if (idMatch !== null) {
        let id = idMatch[1];
        let content = "focus = {" + focusCode;

        // x, y を取得
        let x = parseInt(focusCode.match(/\s+x\s=\s(\d+)/i)[1], 10);
        let y = parseInt(focusCode.match(/\s+y\s=\s(\d+)/i)[1], 10);

        focuses.push({
          id: id,
          x: x,
          y: y,
          content: content
        });
      }
    }

    this.focuses = focuses;
    this.updateFocusElm();
    this.generate();
  },

  onDragStart: function(e) {
    e.target.style.opacity = "0.4";
    this.pointerElm.style.display = "block";
    this.mouseOffsetX = e.offsetX; // クリック時の.focus要素上でのマウスの(頂点との)相対座標を保存
    this.mouseOffsetY = e.offsetY;

    e.dataTransfer.setData("text", e.target.dataset.id);
  },

  onDragEnd: function(e) {
    this.pointerElm.style.display = "none";
    e.target.style.opacity = "1.0";
  },

  onDrop: function(e) {
    var self = this;

    var id = e.dataTransfer.getData("text");
    var focusElm = this.getFocusElm(id);
    focusElm.style.position = "absolute";
    focusElm.style.display = "inline-block";
    focusElm.style.margin = "0";

    // 自由に配置
    // focusElm.style.left = e.offsetX - this.mouseOffsetX + "px";
    // focusElm.style.top =  e.offsetY - this.mouseOffsetY + "px";

    // カーソルに最も近いグリッドにスナップさせる(jQueryUIでもできるけど...多少はね?)
    var grid = this.findClosestGridPoint(e.offsetX, e.offsetY);
    focusElm.style.left = (grid[0] - focusElm.clientWidth / 2) + "px"; // 中央揃え
    focusElm.style.top = (grid[1] - focusElm.clientHeight / 2) + "px";

    // x, y を変更(updateFocusElmなどではfocusesの順に要素を追加しているので、data-id == focusesのインデックス)
    this.focuses[id].x = grid[0] / this.GRID;
    this.focuses[id].y = grid[1] / this.GRID;

    if (focusElm.parentNode == this.focusesElm) { // focusesElmからdropされたとき
      this.focusesElm.removeChild(focusElm);
      this.treeElm.appendChild(focusElm);
    }

    this.resultElm.value = this.generate(); // コード生成

    return false;
  },

  onDragOver: function(e) {
    // focusElmではなくマウスカーソルに最も近い格子点を探す
    var grid = this.findClosestGridPoint(e.offsetX, e.offsetY);
    this.pointerElm.style.left = grid[0] - 10 + "px"; // 中央揃えの分だけ左にずらす
    this.pointerElm.style.top = grid[1] - 10 + "px";

    e.preventDefault();
    return false;
  },

  onDropOnFocuses: function(e) {
    var id = e.dataTransfer.getData("text");
    var focusElm = this.getFocusElm(id);
    focusElm.style.position = "static";
    focusElm.style.display = "block";
    focusElm.style.margin = "10px auto";

    focusElm.parentNode.removeChild(focusElm); // 親から削除
    this.focusesElm.appendChild(focusElm);

    this.resultElm.value = this.generate(); // コード生成
  },

  onDragOverFocuses: function(e) {
    e.preventDefault();
    return false;
  },

  placeFocus: function(focus, index, x, y) {
    var focusElm = this.getFocusElm(index);
    focusElm.style.position = "absolute";
    focusElm.style.display = "inline-block";
    focusElm.style.margin = "0";

    focusElm.style.left = x - focusElm.clientWidth / 2 + "px"; // 中央揃え
    focusElm.style.top = y - focusElm.clientHeight / 2 + "px";

    if (focusElm.parentNode == this.focusesElm) {
      this.focusesElm.removeChild(focusElm);
      this.treeElm.appendChild(focusElm);
    }
  },

  findClosestGridPoint: function(x, y) { // x, y は左上基準
    var gridX, gridY;

    if (x % this.GRID > this.GRID / 2) { // 右の線に近ければ (x % this.GRID = 一つ左にある線からの距離)
      // このコードきれいにしたい...
      gridX = this.GRID * Math.floor(x / this.GRID + 1); // x座標は右の線にあわせる
    } else {
      gridX = this.GRID * Math.floor(x / this.GRID); // 左の線
    }

    if (y % this.GRID > this.GRID / 2) { // 下の線に近ければ (y % this.GRID = 一つ上にある線からの距離)
      gridY = this.GRID * Math.floor(y / this.GRID + 1); // 下の線(中央揃えの分だけ上にずらす)
    } else {
      gridY = this.GRID * Math.floor(y / this.GRID); // 上の線
    }

    // 端は禁止
    if (gridX === 0) {
      gridX += this.GRID;
    }

    if (gridY === 0) {
      gridY += this.GRID;
    }

    if (gridX > this.treeElm.clientWidth - this.GRID) {
      gridX = this.GRID * Math.floor(this.treeElm.clientWidth / this.GRID - 1);
    }

    if (gridY > this.treeElm.clientHeight - this.GRID) {
      gridY = this.GRID * Math.floor(this.treeElm.clientHeight / this.GRID - 1);
    }

    return [gridX, gridY];
  },

  onKeyPress: function(e) {
    if (e.keyCode == 13) {
      e.preventDefault();

      let focus = {
        id: e.target.value,
        content: null
      };

      this.addFocusElm(focus, this.focuses.length);
      this.focuses.push(focus);
      e.target.value = "";

      return false;
    }
  },

  getFocusElm: function(id) {
    return document.querySelector(".focus[data-id='" + id + "']");
  },

  addFocusElm: function(focus, id) {
    var self = this;

    var focusElm = document.createElement("div");
    focusElm.classList.add("focus");
    focusElm.draggable = true;
    focusElm.dataset.id = id;
    focusElm.addEventListener("dragstart", function(e){ self.onDragStart(e); }, false); // どうしてfunctionで囲むとthisがちゃんとcreatorUIになるのだろうか
    focusElm.addEventListener("dragend",   function(e){ self.onDragEnd(e); },   false);
    focusElm.innerHTML = focus.id;

    this.focusesElm.appendChild(focusElm);

    return focusElm;
  },

  updateFocusElm: function() {
    this.focusesElm.innerHTML = "";
    for (let focusElm of document.querySelectorAll(".focus")) {
      focusElm.parentNode.removeChild(focusElm);
    }

    for (var i = 0; i < this.focuses.length; i++) {
      this.addFocusElm(this.focuses[i], i);
      this.placeFocus(this.focuses[i], i, (this.focuses[i].x + 1) * this.GRID, (this.focuses[i].y + 1) * this.GRID);
    }
  },

  generate: function() {
    var focusCode = "";
    var focusElms = document.querySelectorAll("#tree .focus");

    for (var i = 0; i < focusElms.length; i++) {
      var focusElm = focusElms[i];

      // tree上になければスルー
      if (focusElm.parentNode !== this.treeElm) {
        continue;
      }

      var gridX = Math.floor(parseInt(focusElm.style.left, 10) / this.GRID);
      var gridY = Math.floor(parseInt(focusElm.style.top, 10) / this.GRID);

      let focus = this.focuses[i];
      console.log(focus);
      if (focus.content != null) {
        focusCode += focus.content
          .replace(/(\s+)x\s=\s(\d+)/i, "$1x = " + focus.x)
          .replace(/(\s+)y\s=\s(\d+)/i, "$1y = " + focus.y);
      } else {
        focusCode += this.defaultFocusContent(focus.id, focus.x, focus.y);
      }
    }

    return focusCode;
  },

  defaultFocusContent: function(id, x, y) {
    return `
focus = {
  id = ${id}
  icon = GFX_goal_generic_allies_build_infantry
  x = ${x}
  y = ${y}
  cost = 10
  available_if_capitulated = yes
  completion_reward = {
  }
}
    `.toString();
  }
};

var creator = new Creator(
  focuses,
  document.getElementById("editor"),
  document.getElementById("focuses"),
  document.getElementById("tree"),
  document.getElementById("pointer"),
  document.getElementById("add_focus"),
  document.getElementById("copy_result"),
  document.getElementById("result")
);

document.getElementById("import").addEventListener("click", function(e) {
  creator.importFocuses(document.getElementById("import_code").value);
});
