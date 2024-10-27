//-------------------------------------------------------------------
// リンク
//-------------------------------------------------------------------
const labelChars = "abcdeghijklmnopqrstuvwxyz";

const labelCombinations = generateLabelCombinations(labelChars);
let isLabelActive = false;

// ラベルの組み合わせを生成
function generateLabelCombinations(chars) {
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
  const links = Array.from(document.querySelectorAll("a"));
  const inputs = Array.from(document.querySelectorAll("input, textarea"));

  return [...links, ...inputs].filter((element) => {
    const rect = element.getBoundingClientRect();
    return (
      element.checkVisibility() &&
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= document.documentElement.clientHeight &&
      rect.right <= document.documentElement.clientWidth
    );
  });
}

// ラベルを作成してリンクと入力欄に表示
function createLinkLabels() {
  isLabelActive = true;
  const elements = getVisibleElements();
  const linkLabels = elements.map((element, index) => {
    const labelText = labelCombinations[index];
    const rect = element.getBoundingClientRect();

    const label = document.createElement("div");
    label.textContent = labelText;
    label.style.fontSize = "12px";
    label.style.borderRadius = "3px";
    label.style.fontWeight = "bold";
    label.style.position = "absolute";
    label.style.left = `${window.scrollX + rect.left}px`;
    label.style.top = `${window.scrollY + rect.top}px`;
    label.style.backgroundColor = "yellow";
    label.style.color = "black";
    label.style.padding = "2px";
    label.style.zIndex = 1000;

    document.body.appendChild(label);
    return { element, label, labelText };
  });

  console.log(elements.length);

  let currentInput = "";
  function handleKeyInput(event) {
    event.preventDefault();

    currentInput += event.key;
    const match = linkLabels.find(({ labelText }) => labelText === currentInput);
    if (match) {
      if (match.element.tagName === "A") {
        window.location.href = match.element.href;
      } else {
        match.element.focus();
      }
      resetLinkLabels();
    } else if (!labelCombinations.slice(0, elements.length).some((label) =>  label.startsWith(currentInput))) {
      resetLinkLabels();
    } else if (event.key === "Escape") {
      resetLinkLabels();
    }
  }

  document.addEventListener("keydown", handleKeyInput);

  function resetLinkLabels() {
    linkLabels.forEach(({ label }) => label.remove());
    document.removeEventListener("keydown", handleKeyInput);
    isLabelActive = false;
  }
}

//-------------------------------------------------------------------
// キーバインディング
//-------------------------------------------------------------------

let keySequence = "";
document.addEventListener("keydown", (event) => {
  if (document.activeElement.tagName === "INPUT") return;
  if (document.activeElement.tagName === "TEXTAREA") return;
  if (isLabelActive) return;

  keySequence = keySequence.slice(-1) + event.key;

  const scrollSpeed = 50;

  let callDefault = false;
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
      createLinkLabels();
      break;
    // --------------------------------------------------------------
    // スクロール
    // --------------------------------------------------------------
    case "h":
      window.scrollBy({left: -scrollSpeed, behavior: "smooth"});
      break;
    case "j":
      window.scrollBy({top: scrollSpeed, behavior: "smooth"});
      break;
    case "k":
      window.scrollBy({top: -scrollSpeed, behavior: "smooth"});
      break;
    case "l":
      window.scrollBy({left: scrollSpeed, behavior: "smooth"});
      break;
    case "d":
      window.scrollBy({top: window.innerHeight / 2, left: 0, behavior: "smooth"});
      break;
    case "u":
      window.scrollBy({top: -window.innerHeight / 2, left: 0, behavior: "smooth"});
      break;
    case "G":
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      break;
    case "g":
      if (keySequence === "gg") window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    // --------------------------------------------------------------
    // デフォルト
    // --------------------------------------------------------------
    default:
      callDefault = true;
      break;
  }

  if (!callDefault) event.preventDefault();
});
