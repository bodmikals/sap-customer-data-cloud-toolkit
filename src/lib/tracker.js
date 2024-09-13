import Web from '@sap_oss/automated-usage-tracking-tool'

const getCredentials = () => {
  if (
    !process.env.REACT_APP_TRACKER_API_KEY_DEV ||
    !process.env.REACT_APP_TRACKER_DATA_CENTER_DEV ||
    !process.env.REACT_APP_TRACKER_API_KEY_PROD ||
    !process.env.REACT_APP_TRACKER_DATA_CENTER_PROD
  ) {
    return null
  }

  const API_KEY = process.env.REACT_APP_RELEASE_BUILD ? process.env.REACT_APP_TRACKER_API_KEY_PROD : process.env.REACT_APP_TRACKER_API_KEY_DEV
  const DATA_CENTER = process.env.REACT_APP_RELEASE_BUILD ? process.env.REACT_APP_TRACKER_DATA_CENTER_PROD : process.env.REACT_APP_TRACKER_DATA_CENTER_DEV
  return { apiKey: API_KEY, dataCenter: DATA_CENTER }
}

export const initTracker = () => {
  const credentials = getCredentials()

  if (!credentials) {
    console.log('Tracking tool was not initialized due to missing API key or data center configuration.')
    return null
  }

  return new Web(credentials)
}

const trackingTool = initTracker()

function shouldSkipTracking() {
  return !trackingTool || window.Cypress
}

export async function requestConsentConfirmation() {
  if (shouldSkipTracking()) {
    return null
  }
  return await trackingTool.requestConsentConfirmation({
    message: `
    <h2>SAP Customer Data Cloud toolkit</h2>
    This app collects anonymous usage data to help deliver and improve this product. By installing this app, you agree to share this information with SAP. If you wish to revoke your consent, please uninstall the app. Do you want to continue?
  `,
  })
}

export async function trackUsage({ featureName }) {
  if (shouldSkipTracking()) {
    return null
  }
  return await trackingTool.trackUsage({
    toolName: 'Customer Data Cloud toolkit',
    featureName,
  })
}