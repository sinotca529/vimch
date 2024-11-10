//-------------------------------------------------------------------
// クラス定義
//-------------------------------------------------------------------

class Util {
  static visible(elem) {
    const rect = elem.getBoundingClientRect();
    return (
      elem.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
        contentVisibilityAuto: true,
      }) &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  static focusInput(elem) {
    if (elem.tagName === "INPUT" || elem.tagName === "TEXTAREA") {
      elem.focus();
      // カーソルを末尾に移動
      const length = elem.value.length;
      elem.setSelectionRange(length, length);
    } else if (elem.contentEditable === "true") {
      elem.focus();
      // カーソルを末尾に移動
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(elem);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }
}

class LinkHop {
  constructor() {
    this._keyBinds = LinkHop._makeKeyBinds();
    this._useNewTab = false;
    this._currentInput = "";
    this._labels = [];
  }

  static _makeKeyBinds() {
    const chars = "abcdeghijklmnopqrstuvwxyz";
    const combinations = [];
    for (let i = 0; i < chars.length; i++) {
      for (let j = 0; j < chars.length; j++) {
        combinations.push(chars[i] + chars[j]);
      }
    }
    return combinations;
  }

  static _getVisibleClickableElements() {
    const clickable = Array.from(
      document.querySelectorAll(
        "a, input, textarea, summary, button, [role='button'], [contenteditable=true]",
      ),
    );
    return clickable.filter((e) => Util.visible(e));
  }

  isActive() {
    return this._labels.length != 0;
  }

  _makeLabels() {
    const labelFrag = document.createDocumentFragment();
    this._labels = LinkHop._getVisibleClickableElements()
      .slice(0, this._keyBinds.length)
      .map((element, index) => {
        const keyBind = this._keyBinds[index];
        const rect = element.getBoundingClientRect();
        const label = document.createElement("div");
        label.textContent = keyBind.toUpperCase();
        label.className = "vimch-label";
        label.style.left = `${window.scrollX + rect.left}px`;
        label.style.top = `${window.scrollY + rect.top}px`;
        labelFrag.appendChild(label);
        return { element, label, keyBind };
      });
    return labelFrag;
  }

  _clickElement = (elem) => {
    if (
      ["INPUT", "TEXTAREA"].includes(elem.tagName) ||
      elem.contentEditable === "true"
    ) {
      Util.focusInput(elem);
    } else {
      elem.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ctrlKey: this._useNewTab,
        }),
      );
    }
  };

  _handleKeyInput = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.key === "Escape") {
      this._deactivateLinkLabels();
      return;
    }

    this._currentInput += event.key;
    const found = this._labels.find(
      ({ keyBind }) => keyBind === this._currentInput,
    );

    if (found) {
      this._clickElement(found.element);
      this._deactivateLinkLabels();
    } else if (
      !this._labels.some(({ keyBind }) =>
        keyBind.startsWith(this._currentInput),
      )
    ) {
      this._deactivateLinkLabels();
    }
  };

  activateLinkLabels(useNewTab) {
    if (this.isActive()) return;
    document.body.appendChild(this._makeLabels());
    this._currentInput = "";
    this._useNewTab = useNewTab;
    document.addEventListener("keydown", this._handleKeyInput);
  }

  _deactivateLinkLabels = () => {
    this._labels.forEach(({ label }) => label.remove());
    this._labels = [];
    document.removeEventListener("keydown", this._handleKeyInput);
  };
}

class SmoothScroll {
  constructor() {
    this._dir = "";
    this._field = "top";
    this._verocity = 0.8;
    this._target = window;
  }

  static _windowIsScrollable() {
    const vert = document.documentElement.scrollHeight - window.innerHeight;
    const hori = document.documentElement.scrollWidth - window.innerWidth;
    return vert || hori;
  }

  static _getScrollTarget() {
    if (SmoothScroll._windowIsScrollable()) return window;

    // windowが スクロール不可能な場合にのみ、他の要素を探索
    // スクロール可能な最も大きい要素を探索
    let target = window;
    let largestArea = 0;
    document.querySelectorAll("div").forEach((elem) => {
      if (!Util.visible(elem)) return;

      const ofy = window.getComputedStyle(elem).overflowY;
      if (!["scroll", "auto"].includes(ofy)) return;

      const rect = elem.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (area > largestArea) {
        largestArea = area;
        target = elem;
      }
    });

    return target;
  }

  _inner(startPos, startTime, dir) {
    if (dir != this._dir) return;
    const elapsedTime = performance.now() - startTime;
    const pos = startPos + this._verocity * elapsedTime;
    this._target.scrollTo({ [this._field]: pos });
    requestAnimationFrame(() => this._inner(startPos, startTime, dir));
  }

  scroll(dir, triggerKey) {
    if (dir === this._dir) return;

    this._target = SmoothScroll._getScrollTarget();
    this._dir = dir;
    this._verocity = ["up", "left"].includes(dir) ? -0.8 : 0.8;
    this._field = ["up", "down"].includes(dir) ? "top" : "left";

    const startPos =
      this._target === window
        ? this._field === "top"
          ? window.pageYOffset
          : window.pageXOffset
        : this._field === "top"
          ? this._target.scrollTop
          : this._target.scrollLeft;

    this._inner(startPos, performance.now(), dir);

    const handleKeyUp = (e) => {
      if (e.key === triggerKey) {
        this._dir = "";
        document.removeEventListener("keyup", handleKeyUp);
      }
    };
    document.addEventListener("keyup", handleKeyUp);
  }
}

class Search {
  constructor() {
    this._query = "";

    const fi = this._makeFindBox();
    this._findBox = fi.findBox;
    this._input = fi.input;

    document.body.appendChild(this._findBox);
  }

  _makeFindBox = () => {
    const findBox = document.createElement("div");
    findBox.className = "vimch-insert";
    findBox.style.display = "none";

    const input = document.createElement("input");
    input.id = "vimch-search";
    input.type = "text";
    input.style.width = "200px";
    input.style.fontSize = "14px";
    findBox.appendChild(input);

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault(); // Enterキーを無効化
        this._query = document.getElementById("vimch-search").value;
        input.blur();
        this.next();
      }
    });

    return { findBox, input };
  };

  // find(aString, aCaseSensitive, aBackwards, aWrapAround, aWholeWord, aSearchInFrames, aShowDialog)
  next = () => {
    if (this._query.length === 0) return;
    this._showFindBox();
    this._input.value = "";
    window.find(this._query, false, false, true, false, true, false);
    this._input.value = this._query;
  };
  prev = () => {
    if (this._query.length === 0) return;
    this._showFindBox();
    this._input.value = "";
    window.find(this._query, false, true, true, false, true, false);
    this._input.value = this._query;
  };

  _showFindBox = () => (this._findBox.style.display = "block");
  hideFindBox = () => (this._findBox.style.display = "none");

  focusFindBox = () => {
    this._showFindBox();
    Util.focusInput(this._input);
  };

  isActive = () => {
    return this._findBox.style.display === "block";
  };
}
const search = new Search();

//-------------------------------------------------------------------
// スタイル
//-------------------------------------------------------------------

const style = document.createElement("style");
style.textContent = `
  .vimch-label {
    font-family: "Source Code Pro", Consolas, "Ubuntu Mono", Menlo, "DejaVu Sans Mono", monospace, monospace;
    font-size: 16px;
    font-weight: bold;
    border-radius: 3px;
    position: absolute;
    background-color: yellow;
    color: black;
    padding: 2px;
    z-index: 2147483647;
  }
  .vimch-insert {
    position: fixed;
    bottom: 10px;
    right: 10px;
    padding: 8px 16px;
    background-color: white;
    color: black;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 16px;
    display: none;
  }
`;

//-------------------------------------------------------------------
// 処理
//-------------------------------------------------------------------

const linkHop = new LinkHop();
const smoothScroll = new SmoothScroll();

// スタイルの登録
document.head.appendChild(style);

// インサートモード用の要素登録
const insertModeBox = document.createElement("div");
insertModeBox.textContent = "Insert Mode";
insertModeBox.className = "vimch-insert";
document.body.appendChild(insertModeBox);

// キーバインディング
let keySequence = "";
document.addEventListener(
  "keydown",
  (event) => {
    if (event.ctrlKey) return;
    if (linkHop.isActive()) return;

    const activeElem = document.activeElement;
    if (
      ["INPUT", "TEXTAREA"].includes(activeElem.tagName) ||
      activeElem.contentEditable === "true"
    ) {
      if (event.key === "Escape") {
        activeElem.blur();
        search.hideFindBox();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    const isInsertMode = insertModeBox.style.display == "block";
    if (isInsertMode) {
      if (event.key === "Escape") insertModeBox.style.display = "none";
      return;
    }

    if (event.key === "Escape") search.hideFindBox();

    event.preventDefault();
    event.stopImmediatePropagation();

    const scrollSpeed = 50;
    keySequence = keySequence.slice(-1) + event.key;

    switch (event.key) {
      // --------------------------------------------------------------
      // タブ操作
      // --------------------------------------------------------------
      case "J":
        chrome.runtime.sendMessage({ action: "moveTab", direction: "next" });
        break;
      case "K":
        chrome.runtime.sendMessage({ action: "moveTab", direction: "prev" });
        break;
      case "x":
        chrome.runtime.sendMessage({ action: "closeTab" });
        break;
      // --------------------------------------------------------------
      // 画面遷移
      // --------------------------------------------------------------
      case "H":
        history.back();
        break;
      case "L":
        history.forward();
        break;
      case "f":
      case "F":
        linkHop.activateLinkLabels(event.shiftKey);
        break;
      // --------------------------------------------------------------
      // スクロール
      // --------------------------------------------------------------
      case "h":
        smoothScroll.scroll("left", event.key);
        break;
      case "j":
        smoothScroll.scroll("down", event.key);
        break;
      case "k":
        smoothScroll.scroll("up", event.key);
        break;
      case "l":
        smoothScroll.scroll("right", event.key);
        break;
      case "d":
        window.scrollBy({ top: window.innerHeight / 2, behavior: "smooth" });
        break;
      case "u":
        window.scrollBy({ top: -window.innerHeight / 2, behavior: "smooth" });
        break;
      case "G":
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
        });
        break;
      case "g":
        if (keySequence === "gg")
          window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      // --------------------------------------------------------------
      // 検索
      // --------------------------------------------------------------
      case "/":
        search.focusFindBox();
        break;
      case "n":
        search.next();
        break;
      case "N":
        search.prev();
        break;
      // --------------------------------------------------------------
      // インサートモード
      // --------------------------------------------------------------
      case "i":
        insertModeBox.style.display = "block";
        break;
    }
  },
  true,
);
