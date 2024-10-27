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

// 現在の画面内に表示されているリンクと入力欄を取得
function getVisibleElements() {
  const clickable = Array.from(
    document.querySelectorAll(
      "a, input, textarea, summary, button, [role='button']",
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
  const labels = getVisibleElements().map((element, index) => {
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

    currentInput += event.key;
    const match = labels.find(({ keyBind }) => keyBind === currentInput);
    if (match) {
      match.element.dispatchEvent(
        new MouseEvent("click", {
          bubbles: true,
          cancelable: true,
          ctrlKey: useNewTab,
        }),
      );
      resetLinkLabels();
    } else if (
      !labels.some(({ keyBind }) => keyBind.startsWith(currentInput))
    ) {
      resetLinkLabels();
    } else if (event.key === "Escape") {
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
document.addEventListener("keydown", (event) => {
  if (event.ctrlKey) return;
  if (document.activeElement.tagName === "INPUT") return;
  if (document.activeElement.tagName === "TEXTAREA") return;

  const isInsertMode = insertModeBox.style.display == 'block';
  if (isInsertMode) {
    if (event.key === "Escape") insertModeBox.style.display = 'none';
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
      window.scrollBy({ left: -scrollSpeed, behavior: "smooth" });
      break;
    case "j":
      window.scrollBy({ top: scrollSpeed, behavior: "smooth" });
      break;
    case "k":
      window.scrollBy({ top: -scrollSpeed, behavior: "smooth" });
      break;
    case "l":
      window.scrollBy({ left: scrollSpeed, behavior: "smooth" });
      break;
    case "d":
      window.scrollBy({ top: window.innerHeight / 2, behavior: "smooth" });
      break;
    case "u":
      window.scrollBy({ top: -window.innerHeight / 2, behavior: "smooth" });
      break;
    case "G":
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      break;
    case "g":
      if (keySequence === "gg") window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    // --------------------------------------------------------------
    // インサートモード
    // --------------------------------------------------------------
    case "i":
      insertModeBox.style.display = 'block';
      break;
  }
}, true);

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
