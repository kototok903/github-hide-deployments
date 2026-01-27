/**
 * Hide Deployments for GitHub
 * Hides older deployment messages in PR timelines, keeping only the most recent per environment
 */

// Current settings
let settings = {
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

// Track expansion count for current page (for "Load more" feature)
let expansionCount = 0;

// Track if environments have been auto-expanded on this page
let hasAutoExpandedEnvironments = false;

// CSS classes for each type (so we can toggle them independently)
const CLASS_SUCCESSFUL_DEPLOYMENT = 'gh-hide-successful-deployment';
const CLASS_OLD_DEPLOYMENT = 'gh-hide-old-deployment';
const CLASS_DESTROYED_DEPLOYMENT = 'gh-hide-destroyed-deployment';
const CLASS_FAILED_DEPLOYMENT = 'gh-hide-failed-deployment';

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
 * Hides failed deployments
 */
function hideFailedDeployments() {
  const failedLabels = document.querySelectorAll('.TimelineItem .Label[title="Deployment Status Label: Failure"]');

  failedLabels.forEach((label) => {
    const container = label.closest('.js-socket-channel, .js-timeline-item');
    if (container) {
      container.dataset.failedDeployment = 'true';
      container.classList.add(CLASS_FAILED_DEPLOYMENT);
    }
  });
}

/**
 * Shows all failed deployments
 */
function showFailedDeployments() {
  document.querySelectorAll(`.${CLASS_FAILED_DEPLOYMENT}`).forEach((el) => {
    el.classList.remove(CLASS_FAILED_DEPLOYMENT);
  });
}

/**
 * Hides ALL deployment messages in the timeline
 */
function hideSuccessfulDeployments() {
  const deploymentContainers = document.querySelectorAll('[data-url*="/partials/deployed_event/"]');
  deploymentContainers.forEach((container) => {
    container.classList.add(CLASS_SUCCESSFUL_DEPLOYMENT);
  });
}

/**
 * Shows all successful deployment messages
 */
function showSuccessfulDeployments() {
  document.querySelectorAll(`.${CLASS_SUCCESSFUL_DEPLOYMENT}`).forEach((el) => {
    el.classList.remove(CLASS_SUCCESSFUL_DEPLOYMENT);
  });
}

/**
 * Auto-expand the "Show environments" button (only once per page load)
 */
function expandEnvironments() {
  if (hasAutoExpandedEnvironments) {
    return;
  }

  const envContainers = document.querySelectorAll('.js-details-container.branch-action-item');
  envContainers.forEach((container) => {
    const button = container.querySelector('button.js-details-target[aria-expanded="false"]');
    if (button) {
      const closedSpan = button.querySelector('.statuses-toggle-closed');
      if (closedSpan && closedSpan.textContent.includes('Show environments')) {
        button.click();
        hasAutoExpandedEnvironments = true;
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
function hideOldSuccessfulDeployments() {
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
    showSuccessfulDeployments();
    showOldDeployments();
    showDestroyedDeployments();
    showFailedDeployments();
    return;
  }

  // Handle successful deployments (hideSuccessfulDeployments takes precedence over hideOldSuccessfulDeployments)
  if (settings.hideSuccessfulDeployments) {
    hideSuccessfulDeployments();
  } else {
    showSuccessfulDeployments();
    if (settings.hideOldSuccessfulDeployments) {
      hideOldSuccessfulDeployments();
    } else {
      showOldDeployments();
    }
  }

  // Handle destroyed deployments
  if (settings.hideDestroyedDeployments) {
    hideDestroyedDeployments();
  } else {
    showDestroyedDeployments();
  }

  // Handle failed deployments
  if (settings.hideFailedDeployments) {
    hideFailedDeployments();
  } else {
    showFailedDeployments();
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

  // Handle successful deployments
  if (settings.hideSuccessfulDeployments) {
    hideSuccessfulDeployments();
  } else if (settings.hideOldSuccessfulDeployments) {
    hideOldSuccessfulDeployments();
  }

  // Handle destroyed deployments
  if (settings.hideDestroyedDeployments) {
    hideDestroyedDeployments();
  }

  // Handle failed deployments
  if (settings.hideFailedDeployments) {
    hideFailedDeployments();
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
    hasAutoExpandedEnvironments = false; // Reset auto-expand flag on navigation
    processPage();
  });

  // Watch for dynamic content additions and attribute changes
  const observer = new MutationObserver((mutations) => {
    // Separate attribute mutations from childList mutations
    const attributeMutations = mutations.filter((m) => m.type === 'attributes');
    const childListMutations = mutations.filter((m) => m.type === 'childList');

    // Handle aria-expanded changes on environments toggle button
    for (const mutation of attributeMutations) {
      if (mutation.attributeName === 'aria-expanded') {
        const button = mutation.target;
        // Check if this is an environments toggle button
        const container = button.closest('.js-details-container.branch-action-item');
        if (container && button.matches('button.js-details-target')) {
          const isExpanded = button.getAttribute('aria-expanded') === 'true';
          if (isExpanded && settings.enabled && settings.environmentsFullHeight) {
            setEnvironmentsFullHeight();
          } else if (!isExpanded) {
            // Always reset height when collapsed (so GitHub's collapse works)
            resetEnvironmentsHeight();
          }
        }
      }
    }

    const hasNewDeployments = childListMutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        // Check both the node itself AND its descendants
        return (
          node.matches?.('[data-url*="/partials/deployed_event/"]') ||
          node.querySelector?.('[data-url*="/partials/deployed_event/"]') ||
          node.matches?.('.Label[title="Deployment Status Label: Destroyed"]') ||
          node.querySelector?.('.Label[title="Deployment Status Label: Destroyed"]') ||
          node.matches?.('.Label[title="Deployment Status Label: Failure"]') ||
          node.querySelector?.('.Label[title="Deployment Status Label: Failure"]')
        );
      })
    );

    // Check if new "Load more" buttons appeared or if content was expanded
    const hasNewTimelineContent = childListMutations.some((mutation) =>
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
    const hasNewEnvironments = childListMutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        return (
          node.matches?.('.js-details-container.branch-action-item') ||
          node.querySelector?.('.js-details-container.branch-action-item')
        );
      })
    );

    // Check if merge-status-list was added/replaced (e.g., after new commit)
    const hasNewMergeStatusList = childListMutations.some((mutation) =>
      Array.from(mutation.addedNodes).some((node) => {
        if (node.nodeType !== 1) return false;
        return node.matches?.('.merge-status-list') || node.querySelector?.('.merge-status-list');
      })
    );

    if (hasNewDeployments && settings.enabled) {
      // Handle successful deployments
      if (settings.hideSuccessfulDeployments) {
        hideSuccessfulDeployments();
      } else if (settings.hideOldSuccessfulDeployments) {
        hideOldSuccessfulDeployments();
      }

      // Handle destroyed deployments (independent)
      if (settings.hideDestroyedDeployments) {
        hideDestroyedDeployments();
      }

      // Handle failed deployments (independent)
      if (settings.hideFailedDeployments) {
        hideFailedDeployments();
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

    // Handle new merge-status-list (e.g., when GitHub re-renders after new commit)
    // Only apply full height if the container is currently expanded
    if (hasNewMergeStatusList && settings.enabled && settings.environmentsFullHeight) {
      const expandedButton = document.querySelector(
        '.js-details-container.branch-action-item button.js-details-target[aria-expanded="true"]'
      );
      if (expandedButton) {
        setEnvironmentsFullHeight();
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-expanded'],
  });
}

init();
