// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  hideSuccessfulDeployments: true,
  hideOldSuccessfulDeployments: true,
  hideDestroyedDeployments: true,
  hideFailedDeployments: false,
  autoExpandEnvironments: true,
  environmentsFullHeight: true,
  autoExpandLoadMore: true,
  expansionLimit: 2,
};

// Update UI based on enabled state
function updateEnabledState(enabled) {
  const powerButton = document.getElementById('powerButton');
  const switchRows = document.querySelectorAll('.switch-row');
  const subsettingRows = document.querySelectorAll('.subsetting-row');
  const sectionHeaders = document.querySelectorAll('.section-header');

  powerButton.classList.toggle('on', enabled);
  powerButton.classList.toggle('off', !enabled);

  switchRows.forEach((row) => {
    row.classList.toggle('disabled', !enabled);
  });

  sectionHeaders.forEach((header) => {
    header.classList.toggle('disabled', !enabled);
  });

  // Also disable subsetting rows when extension is off
  if (!enabled) {
    subsettingRows.forEach((row) => {
      row.classList.add('disabled');
    });
  } else {
    // Re-evaluate subsetting states based on their parent toggles
    updateHideSuccessfulState();
    updateEnvironmentsFullHeightState();
    updateExpansionLimitState();
  }
}

// Update old/destroyed/failed deployment toggles based on hide-all state
function updateHideSuccessfulState() {
  const hideAllEnabled = document.getElementById('hideSuccessfulDeployments').checked;
  const hideOldRow = document.getElementById('hideOldSuccessfulDeploymentsRow');

  hideOldRow.classList.toggle('disabled', hideAllEnabled);
}

// Update environments full height toggle state based on autoExpandEnvironments toggle
function updateEnvironmentsFullHeightState() {
  const autoExpandEnabled = document.getElementById('autoExpandEnvironments').checked;
  const fullHeightRow = document.getElementById('environmentsFullHeightRow');
  fullHeightRow.classList.toggle('disabled', !autoExpandEnabled);
}

// Update expansion limit input state based on autoExpandLoadMore toggle
function updateExpansionLimitState() {
  const autoExpandEnabled = document.getElementById('autoExpandLoadMore').checked;
  const expansionLimitRow = document.getElementById('expansionLimitRow');
  expansionLimitRow.classList.toggle('disabled', !autoExpandEnabled);
}

// Load settings and update UI
async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  document.getElementById('hideSuccessfulDeployments').checked = settings.hideSuccessfulDeployments;
  document.getElementById('hideOldSuccessfulDeployments').checked = settings.hideOldSuccessfulDeployments;
  document.getElementById('hideDestroyedDeployments').checked = settings.hideDestroyedDeployments;
  document.getElementById('hideFailedDeployments').checked = settings.hideFailedDeployments;
  document.getElementById('autoExpandEnvironments').checked = settings.autoExpandEnvironments;
  document.getElementById('environmentsFullHeight').checked = settings.environmentsFullHeight;
  document.getElementById('autoExpandLoadMore').checked = settings.autoExpandLoadMore;
  document.getElementById('expansionLimit').value = settings.expansionLimit;
  updateEnabledState(settings.enabled);
  updateHideSuccessfulState();
  updateEnvironmentsFullHeightState();
  updateExpansionLimitState();
}

// Save setting and notify content script
async function saveSetting(key, value) {
  await chrome.storage.sync.set({ [key]: value });

  // Notify active GitHub tabs to update
  const tabs = await chrome.tabs.query({ url: 'https://github.com/*/*/pull/*' });
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, { type: 'settingsChanged', settings: { [key]: value } });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Power button toggle
  document.getElementById('powerButton').addEventListener('click', async () => {
    const settings = await chrome.storage.sync.get({ enabled: true });
    const newEnabled = !settings.enabled;
    updateEnabledState(newEnabled);
    saveSetting('enabled', newEnabled);
  });

  document.getElementById('hideSuccessfulDeployments').addEventListener('change', (e) => {
    saveSetting('hideSuccessfulDeployments', e.target.checked);
    updateHideSuccessfulState();
  });

  document.getElementById('hideOldSuccessfulDeployments').addEventListener('change', (e) => {
    saveSetting('hideOldSuccessfulDeployments', e.target.checked);
  });

  document.getElementById('hideDestroyedDeployments').addEventListener('change', (e) => {
    saveSetting('hideDestroyedDeployments', e.target.checked);
  });

  document.getElementById('hideFailedDeployments').addEventListener('change', (e) => {
    saveSetting('hideFailedDeployments', e.target.checked);
  });

  document.getElementById('autoExpandEnvironments').addEventListener('change', (e) => {
    saveSetting('autoExpandEnvironments', e.target.checked);
    updateEnvironmentsFullHeightState();
  });

  document.getElementById('environmentsFullHeight').addEventListener('change', (e) => {
    saveSetting('environmentsFullHeight', e.target.checked);
  });

  document.getElementById('autoExpandLoadMore').addEventListener('change', (e) => {
    saveSetting('autoExpandLoadMore', e.target.checked);
    updateExpansionLimitState();
  });

  document.getElementById('expansionLimit').addEventListener('change', (e) => {
    const value = Math.max(1, Math.min(99, parseInt(e.target.value) || 2));
    e.target.value = value;
    saveSetting('expansionLimit', value);
  });

  // Reset to defaults
  document.getElementById('resetButton').addEventListener('click', async () => {
    await chrome.storage.sync.set(DEFAULT_SETTINGS);
    loadSettings();

    // Notify active GitHub tabs to update
    const tabs = await chrome.tabs.query({ url: 'https://github.com/*/*/pull/*' });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'settingsChanged', settings: DEFAULT_SETTINGS });
    }
  });
});
