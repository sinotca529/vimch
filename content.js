//-------------------------------------------------------------------
// リンク
//-------------------------------------------------------------------

// ラベルの組み合わせを生成
function generateLabelCombinations() {
  const chars = "abcdeghijklmnopqrstuvwxyz";
  const combinations = [];
  for (let i = 0; i < chars.length; i++) {
    for (let j = 0; j < chars.length; j++) {
      combinations.push(chars[i] + chars[j]);
    }
  }
  return combinations;
}

// 現在表示されているクリックできそうな要素を取得
function getVisibleElements() {
  const clickable = Array.from(
    document.querySelectorAll(
      "a, input, textarea, summary, button, [role='button'], [contenteditable=true]",
    ),
  );
  return clickable.filter((element) => {
    const rect = element.getBoundingClientRect();
    return (
      element.checkVisibility({
        opacityProperty: true,
        visibilityProperty: true,
        contentVisibilityAuto: true,
      }) &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  });
}

// ラベルを作成してリンクと入力欄に表示
const labelCombinations = generateLabelCombinations();
let isLabelActive = false;
function createLinkLabels(useNewTab) {
  isLabelActive = true;
  const labelFrag = document.createDocumentFragment();
  const labels = getVisibleElements()
    .slice(0, labelCombinations.length)
    .map((element, index) => {
      const keyBind = labelCombinations[index];
      const rect = element.getBoundingClientRect();
      const label = document.createElement("div");
      label.textContent = keyBind.toUpperCase();
      label.className = "vimch-label";
      label.style.left = `${window.scrollX + rect.left}px`;
      label.style.top = `${window.scrollY + rect.top}px`;
      labelFrag.appendChild(label);
      return { element, label, keyBind };
    });
  document.body.appendChild(labelFrag);

  let currentInput = "";
  function handleKeyInput(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.key === "Escape") {
      resetLinkLabels();
      return;
    }

    currentInput += event.key;
    const found = labels.find(({ keyBind }) => keyBind === currentInput);

    if (found) {
      const elem = found.element;
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
      } else {
        elem.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            ctrlKey: useNewTab,
          }),
        );
      }
      resetLinkLabels();
    } else if (
      !labels.some(({ keyBind }) => keyBind.startsWith(currentInput))
    ) {
      resetLinkLabels();
    }
  }

  document.addEventListener("keydown", handleKeyInput);

  function resetLinkLabels() {
    labels.forEach(({ label }) => label.remove());
    document.removeEventListener("keydown", handleKeyInput);
    isLabelActive = false;
  }
}

//-------------------------------------------------------------------
// スクロール
//-------------------------------------------------------------------

const SmoothScroll = {};
// スクロール方向 (空のときは停止)
SmoothScroll._dir = "";

SmoothScroll._inner = function (startPos, startTime, dir) {
  if (dir != SmoothScroll._dir) return;

  const speed = 0.8;
  const elapsedTime = performance.now() - startTime;
  const sign = ["up", "left"].includes(SmoothScroll._dir) ? -1 : 1;
  const amount = startPos + sign * elapsedTime * speed;
  const field = ["up", "down"].includes(SmoothScroll._dir) ? "top" : "left";
  window.scrollTo({ [field]: amount });

  requestAnimationFrame(() => SmoothScroll._inner(startPos, startTime, dir));
};

SmoothScroll.scroll = function (dir, triggerKey) {
  const dirChanged = dir !== SmoothScroll._dir;
  SmoothScroll._dir = dir;
  if (!dirChanged) return;

  const field = ["up", "down"].includes(SmoothScroll._dir)
    ? "pageYOffset"
    : "pageXOffset";
  SmoothScroll._inner(window[field], performance.now(), dir);

  function handleKeyUp(e) {
    if (e.key === triggerKey) {
      SmoothScroll._dir = "";
      document.removeEventListener("keyup", handleKeyUp);
    }
  }
  document.addEventListener("keyup", handleKeyUp);
};

//-------------------------------------------------------------------
// インサートモード
//-------------------------------------------------------------------

const insertModeBox = document.createElement("div");
insertModeBox.textContent = "Insert Mode";
insertModeBox.className = "vimch-insert";
document.body.appendChild(insertModeBox);

//-------------------------------------------------------------------
// キーバインディング
//-------------------------------------------------------------------

let keySequence = "";
document.addEventListener(
  "keydown",
  (event) => {
    if (event.ctrlKey) return;

    const activeElem = document.activeElement;
    if (
      activeElem.tagName === "INPUT" ||
      activeElem.tagName === "TEXTAREA" ||
      activeElem.contentEditable === "true"
    ) {
      if (event.key === "Escape") {
        activeElem.blur();
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

    if (isLabelActive) return;

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
        createLinkLabels(event.shiftKey);
        break;
      // --------------------------------------------------------------
      // スクロール
      // --------------------------------------------------------------
      case "h":
        SmoothScroll.scroll("left", event.key);
        break;
      case "j":
        SmoothScroll.scroll("down", event.key);
        break;
      case "k":
        SmoothScroll.scroll("up", event.key);
        break;
      case "l":
        SmoothScroll.scroll("right", event.key);
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
      // インサートモード
      // --------------------------------------------------------------
      case "i":
        insertModeBox.style.display = "block";
        break;
    }
  },
  true,
);

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
document.head.appendChild(style);
