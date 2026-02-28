document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('threshold-select');

  browser.storage.sync.get('threshold').then(result => {
    if (result.threshold) {
      select.value = result.threshold.toString();
    }
  }).catch(() => {});

  select.addEventListener('change', () => {
    const value = parseInt(select.value, 10);
    browser.storage.sync.set({ threshold: value }).catch(() => {});
  });
});
