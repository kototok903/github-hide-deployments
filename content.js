/**
 * Hide Deployments for GitHub
 * Hides older deployment messages in PR timelines, keeping only the most recent per environment
 */

// Current settings
let settings = {
  enabled: true,
  hideOldDeployments: true,
  hideDestroyedDeployments: true,
  autoExpandLoadMore: false,
  expansionLimit: 2,
};

// Track expansion count for current page
let expansionCount = 0;

// CSS classes for each type (so we can toggle them independently)
const CLASS_OLD_DEPLOYMENT = 'gh-hide-old-deployment';
const CLASS_DESTROYED_DEPLOYMENT = 'gh-hide-destroyed-deployment';

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get(settings);
    settings = { ...settings, ...stored };
  } catch (e) {
    console.log('[GitHub Hide Deployments] Could not load settings, using defaults');
  }
}

/**
 * Hides destroyed/temporary deployments
 */
function hideDestroyedDeployments() {
  const destroyedLabels = document.querySelectorAll('.TimelineItem .Label[title="Deployment Status Label: Destroyed"]');

  destroyedLabels.forEach((label) => {
    const container = label.closest('.js-socket-channel, .js-timeline-item');
    if (container) {
      // Mark it as a destroyed deployment (for potential unhiding later)
      container.dataset.destroyedDeployment = 'true';

      if (settings.hideDestroyedDeployments) {
        container.classList.add(CLASS_DESTROYED_DEPLOYMENT);
      }
    }
  });
}

/**
 * Shows all destroyed deployments
 */
function showDestroyedDeployments() {
  document.querySelectorAll(`.${CLASS_DESTROYED_DEPLOYMENT}`).forEach((el) => {
    el.classList.remove(CLASS_DESTROYED_DEPLOYMENT);
  });
}

/**
 * Hides old deployments (keeps most recent per environment)
 */
function hideOldDeployments() {
  const deploymentContainers = document.querySelectorAll('[data-url*="/partials/deployed_event/"]');

  if (deploymentContainers.length === 0) {
    return;
  }

  // Group deployments by environment
  const deploymentsByEnv = new Map();

  deploymentContainers.forEach((container) => {
    const envLink = container.querySelector('.TimelineItem-body a.Link--primary.text-bold[href^="http"]');
    const envName = envLink ? envLink.textContent.trim() : 'unknown';

    if (!deploymentsByEnv.has(envName)) {
      deploymentsByEnv.set(envName, []);
    }
    deploymentsByEnv.get(envName).push(container);
  });

  // For each environment, hide all but the last (most recent) deployment
  deploymentsByEnv.forEach((deployments, envName) => {
    if (deployments.length <= 1) {
      return;
    }

    // Deployments appear in DOM order (oldest first), so hide all except the last one
    for (let i = 0; i < deployments.length - 1; i++) {
      // Mark it as an old deployment
      deployments[i].dataset.oldDeployment = 'true';

      if (settings.hideOldDeployments) {
        deployments[i].classList.add(CLASS_OLD_DEPLOYMENT);
      }
    }
  });
}

/**
 * Shows all old deployments
 */
function showOldDeployments() {
  document.querySelectorAll(`.${CLASS_OLD_DEPLOYMENT}`).forEach((el) => {
    el.classList.remove(CLASS_OLD_DEPLOYMENT);
  });
}

/**
 * Find and click "Load more" buttons to expand the timeline
 */
function expandLoadMore() {
  if (!settings.enabled || !settings.autoExpandLoadMore) {
    return;
  }

  if (expansionCount >= settings.expansionLimit) {
    return;
  }

  // Find "Load more" buttons
  const loadMoreButtons = document.querySelectorAll('button.ajax-pagination-btn');

  for (const button of loadMoreButtons) {
    if (button.textContent.trim().toLowerCase().includes('load more')) {
      expansionCount++;
      button.click();
      // After clicking, the MutationObserver will detect new content
      // and call expandLoadMore again if needed
      return;
    }
  }
}

/**
 * Apply current settings
 */
function applySettings() {
  // If extension is disabled, show everything
  if (!settings.enabled) {
    showOldDeployments();
    showDestroyedDeployments();
    return;
  }

  if (settings.hideOldDeployments) {
    hideOldDeployments();
  } else {
    showOldDeployments();
  }

  if (settings.hideDestroyedDeployments) {
    hideDestroyedDeployments();
  } else {
    showDestroyedDeployments();
  }
}

/**
 * Process the page
 */
function processPage() {
  if (!settings.enabled) {
    return;
  }
  hideOldDeployments();
  hideDestroyedDeployments();
  expandLoadMore();
}

// Listen for settings changes from popup
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'settingsChanged') {
    settings = { ...settings, ...message.settings };
    applySettings();
  }
});

// Initialize
async function init() {
  await loadSettings();
  processPage();

  // Re-run when GitHub dynamically updates the page (SPA navigation)
  document.addEventListener('turbo:load', () => {
    expansionCount = 0; // Reset expansion count on navigation
    processPage();
  });

  // Watch for dynamic content additions
  const observer = new MutationObserver((mutations) => {
    const hasNewDeployments = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        return (
          node.querySelector?.('[data-url*="/partials/deployed_event/"]') ||
          node.querySelector?.('.Label[title="Deployment Status Label: Destroyed"]')
        );
      })
    );

    // Check if new "Load more" buttons appeared or if content was expanded
    const hasNewTimelineContent = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        return (
          node.classList?.contains('TimelineItem') ||
          node.querySelector?.('.TimelineItem') ||
          node.querySelector?.('button.ajax-pagination-btn')
        );
      })
    );

    if (hasNewDeployments) {
      hideOldDeployments();
      hideDestroyedDeployments();
    }

    if (hasNewTimelineContent) {
      expandLoadMore();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

init();
