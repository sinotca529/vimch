chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "moveTab":
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        const activeTab = tabs.find(tab => tab.active);
        const currentIndex = activeTab.index;

        let newIndex;
        if (message.direction === "next") {
          // 次のタブに移動（末尾なら最初に戻る）
          newIndex = (currentIndex + 1) % tabs.length;
        } else if (message.direction === "prev") {
          // 前のタブに移動（最初なら末尾に戻る）
          newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        }

        chrome.tabs.update(tabs[newIndex].id, { active: true });
      });
      break;

    case "closeTab":
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.remove(tabs[0].id);
      });
      break;
  }
});
