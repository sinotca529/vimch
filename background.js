chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "moveTab") {
    console.log('worker');
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
  }
});
