/**
 * Hide Deployments for GitHub
 * Hides older deployment messages in PR timelines, keeping only the most recent per environment
 */

// Current settings
let settings = {
  enabled: true,
  hideAllDeployments: false,
  hideOldDeployments: true,
  hideDestroyedDeployments: true,
  autoExpandEnvironments: false,
  environmentsFullHeight: false,
  autoExpandLoadMore: false,
  expansionLimit: 2,
};

// Track expansion count for current page
let expansionCount = 0;

// CSS classes for each type (so we can toggle them independently)
const CLASS_ALL_DEPLOYMENT = 'gh-hide-all-deployment';
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
      container.dataset.destroyedDeployment = 'true';
      container.classList.add(CLASS_DESTROYED_DEPLOYMENT);
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
 * Hides ALL deployment messages in the timeline
 */
function hideAllDeployments() {
  const deploymentContainers = document.querySelectorAll('[data-url*="/partials/deployed_event/"]');
  deploymentContainers.forEach((container) => {
    container.classList.add(CLASS_ALL_DEPLOYMENT);
  });
}

/**
 * Shows all deployment messages that were hidden by hideAllDeployments
 */
function showAllDeployments() {
  document.querySelectorAll(`.${CLASS_ALL_DEPLOYMENT}`).forEach((el) => {
    el.classList.remove(CLASS_ALL_DEPLOYMENT);
  });
}

/**
 * Auto-expand the "Show environments" button
 */
function expandEnvironments() {
  const envContainers = document.querySelectorAll('.js-details-container.branch-action-item');
  envContainers.forEach((container) => {
    const button = container.querySelector('button.js-details-target[aria-expanded="false"]');
    if (button) {
      const closedSpan = button.querySelector('.statuses-toggle-closed');
      if (closedSpan && closedSpan.textContent.includes('Show environments')) {
        button.click();
      }
    }
  });
}

/**
 * Make environments list full height (remove max-height constraint)
 */
function setEnvironmentsFullHeight() {
  const envLists = document.querySelectorAll('.merge-status-list');
  envLists.forEach((list) => {
    list.style.maxHeight = 'none';
  });
}

/**
 * Reset environments list to default height
 */
function resetEnvironmentsHeight() {
  const envLists = document.querySelectorAll('.merge-status-list');
  envLists.forEach((list) => {
    list.style.maxHeight = '';
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
      deployments[i].dataset.oldDeployment = 'true';
      deployments[i].classList.add(CLASS_OLD_DEPLOYMENT);
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
    showAllDeployments();
    showOldDeployments();
    showDestroyedDeployments();
    return;
  }

  // Hide all takes precedence over individual hide settings
  if (settings.hideAllDeployments) {
    hideAllDeployments();
    hideDestroyedDeployments(); // Destroyed deployments have different DOM structure
  } else {
    showAllDeployments();

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

  // Handle auto-expand features
  if (settings.autoExpandEnvironments) {
    expandEnvironments();
  }

  // Handle environments full height
  if (settings.environmentsFullHeight) {
    setEnvironmentsFullHeight();
  } else {
    resetEnvironmentsHeight();
  }
}

/**
 * Process the page
 */
function processPage() {
  if (!settings.enabled) {
    return;
  }

  // Handle deployment visibility
  if (settings.hideAllDeployments) {
    hideAllDeployments();
    hideDestroyedDeployments();
  } else {
    if (settings.hideOldDeployments) {
      hideOldDeployments();
    }
    if (settings.hideDestroyedDeployments) {
      hideDestroyedDeployments();
    }
  }

  // Handle auto-expand features
  if (settings.autoExpandEnvironments) {
    expandEnvironments();
    if (settings.environmentsFullHeight) {
      setEnvironmentsFullHeight();
    }
  }
  if (settings.autoExpandLoadMore) {
    expandLoadMore();
  }
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
        // Check both the node itself AND its descendants
        return (
          node.matches?.('[data-url*="/partials/deployed_event/"]') ||
          node.querySelector?.('[data-url*="/partials/deployed_event/"]') ||
          node.matches?.('.Label[title="Deployment Status Label: Destroyed"]') ||
          node.querySelector?.('.Label[title="Deployment Status Label: Destroyed"]')
        );
      })
    );

    // Check if new "Load more" buttons appeared or if content was expanded
    const hasNewTimelineContent = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        // Check both the node itself AND its descendants
        return (
          node.matches?.('.TimelineItem') ||
          node.classList?.contains('TimelineItem') ||
          node.querySelector?.('.TimelineItem') ||
          node.matches?.('button.ajax-pagination-btn') ||
          node.querySelector?.('button.ajax-pagination-btn')
        );
      })
    );

    // Check if environments container appeared
    const hasNewEnvironments = mutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        return (
          node.matches?.('.js-details-container.branch-action-item') ||
          node.querySelector?.('.js-details-container.branch-action-item')
        );
      })
    );

    if (hasNewDeployments && settings.enabled) {
      if (settings.hideAllDeployments) {
        hideAllDeployments();
        hideDestroyedDeployments();
      } else {
        if (settings.hideOldDeployments) {
          hideOldDeployments();
        }
        if (settings.hideDestroyedDeployments) {
          hideDestroyedDeployments();
        }
      }
    }

    if (hasNewTimelineContent && settings.enabled && settings.autoExpandLoadMore) {
      expandLoadMore();
    }

    if (hasNewEnvironments && settings.enabled) {
      if (settings.autoExpandEnvironments) {
        expandEnvironments();
      }
      if (settings.environmentsFullHeight) {
        setEnvironmentsFullHeight();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

init();
