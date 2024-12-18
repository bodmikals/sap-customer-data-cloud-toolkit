import ImportAccounts from '../../services/importAccounts/importAccounts'
import { clearConfigurationsErrors, clearTargetSitesErrors, findConfiguration } from '../copyConfigurationExtended/utils'
import { getApiKey, getErrorAsArray } from '../utils'
import {
  setParentsTrue,
  propagateConfigurationState,
  propagateConfigurationSelectBox,
  getAllConfiguration,
  getParent,
  clearConfigurationsState,
  getConfigurationPath,
  getFullConfigurationPath,
} from './utils'
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
const IMPORT_ACCOUNTS_STATE_NAME = 'importAccounts'
const GET_CONFIGURATIONS_ACTION = `${IMPORT_ACCOUNTS_STATE_NAME}/getConfigurations`
const SET_CONFIGURATIONS_ACTION = `${IMPORT_ACCOUNTS_STATE_NAME}/setConfigurations`

export const importAccountsSlice = createSlice({
  name: IMPORT_ACCOUNTS_STATE_NAME,
  initialState: {
    currentSiteApiKey: getApiKey(window.location.hash),
    configurations: [],
    parentNode: [],
    errors: [],
    isLoading: false,
    showSuccessMessage: false,
    currentSiteInformation: {},
    switchId: {},
    selectedConfiguration: [],
  },
  reducers: {
    setConfigurationStatus(state, action) {
      setParentsTrue(state.configurations, action.payload.checkBoxId, action.payload.value)
    },
    setMandatoryFields(state, action) {
      const configuration = findConfiguration(state.configurations, action.payload.checkBoxId)
      configuration.value = action.payload.value
      configuration.mandatory = action.payload.mandatory
    },
    getConfiguration(state, action) {
      const configuration = findConfiguration(state.configurations, action.payload.checkBoxId)
      state.configurations = [configuration]
    },
    clearErrors(state) {
      state.errors = []
      state.apiCardError = undefined
      clearConfigurationsErrors(state.configurations)
      clearTargetSitesErrors(state.targetSites)
    },
    clearConfigurations(state) {
      state.configurations.forEach((configuration) => {
        clearConfigurationsState(configuration, false)
      })
    },
    setSwitchOptions(state, action) {
      const configuration = findConfiguration(state.configurations, action.payload.checkBoxId)
      propagateConfigurationSelectBox(configuration, action.payload)
    },
    setSugestionSchema(state, action) {
      setParentsTrue(state.selectedConfiguration, action.payload.checkBoxId, action.payload.value)
    },
    setRootOptions(state, action) {
      const configuration = findConfiguration(state.configurations, action.payload.checkBoxId)
      configuration.mandatory = true
    },

    setMandatoryStatus(state, action) {
      const configuration = findConfiguration(state.configurations, action.payload.checkBoxId)
      const parent = getParent(state.configurations, 'communications', action.payload.checkBoxId)
      if (parent) {
        configuration.mandatory = true
        configuration.value = true
      }
    },
    setSuggestionTreeMandatoryStatus(state, action) {
      const configuration = findConfiguration(state.selectedConfiguration, action.payload.checkBoxId)
      const parent = getParent(state.selectedConfiguration, 'communications', action.payload.checkBoxId)
      if (parent) {
        configuration.mandatory = true
        configuration.value = true
      }
    },
    setSuggestionClickConfiguration(state, action) {
      console.log('action--', action)
      console.log('state--', JSON.stringify(state.selectedConfiguration))
      const config = getConfigurationPath(state.selectedConfiguration, action.payload.checkBoxId)
      console.log('config--', JSON.stringify(config))
      if (config) {
        state.selectedConfiguration = [config]
      }
    },
    setSuggestionConfiguration(state, action) {
      const configuration = findConfiguration(state.selectedConfiguration, action.payload.checkBoxId)
      state.selectedConfiguration = configuration
    },
    setSelectedConfiguration(state, action) {
      const configuration = getAllConfiguration(state.configurations, action.payload)
      state.selectedConfiguration = configuration
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getConfigurations.pending, (state) => {
      state.isLoading = true
      state.errors = []
      state.configurations = []
    })
    builder.addCase(getConfigurations.fulfilled, (state, action) => {
      state.isLoading = false
      state.configurations = action.payload
    })
    builder.addCase(getConfigurations.rejected, (state, action) => {
      state.isLoading = false
      state.errors = action.payload
    })

    builder.addCase(setConfigurations.pending, (state) => {
      state.isLoading = true
      state.errors = []
      state.showSuccessMessage = false
    })
    builder.addCase(setConfigurations.fulfilled, (state, action) => {
      state.isLoading = false
      state.showSuccessMessage = true
    })
    builder.addCase(setConfigurations.rejected, (state, action) => {
      state.isLoading = false
      state.showSuccessMessage = false
      state.errors = action.payload
    })
  },
})

export const getConfigurations = createAsyncThunk(GET_CONFIGURATIONS_ACTION, async (selectedValue, { getState, rejectWithValue }) => {
  const state = getState()
  const credentials = { userKey: state.credentials.credentials.userKey, secret: state.credentials.credentials.secretKey, gigyaConsole: state.credentials.credentials.gigyaConsole }
  const currentSiteApiKey = state.copyConfigurationExtended.currentSiteApiKey
  const currentDataCenter = state.copyConfigurationExtended.currentSiteInformation.dataCenter
  try {
    if (currentDataCenter) {
      return await new ImportAccounts(credentials, currentSiteApiKey, currentDataCenter).importAccountToConfigTree(selectedValue)
    }
  } catch (error) {
    return rejectWithValue(getErrorAsArray(error))
  }
})

export const setConfigurations = createAsyncThunk(SET_CONFIGURATIONS_ACTION, async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const credentials = { userKey: state.credentials.credentials.userKey, secret: state.credentials.credentials.secretKey, gigyaConsole: state.credentials.credentials.gigyaConsole }
  const currentSiteApiKey = state.copyConfigurationExtended.currentSiteApiKey
  const currentDataCenter = state.copyConfigurationExtended.currentSiteInformation.dataCenter

  try {
    return await new ImportAccounts(credentials, currentSiteApiKey, currentDataCenter).exportDataToCsv(state.importAccounts.configurations)
  } catch (error) {
    return rejectWithValue(getErrorAsArray(error))
  }
})
export const {
  setMandatoryStatus,
  setSuggestionConfiguration,
  setSuggestionTreeMandatoryStatus,
  setRootOptions,
  setSelectedConfiguration,
  setSuggestionClickConfiguration,
  setConfigurationStatus,
  setMandatoryFields,
  clearErrors,
  setSugestionSchema,
  setSwitchOptions,
  clearConfigurations,
} = importAccountsSlice.actions

export const selectConfigurations = (state) => state.importAccounts.configurations
export const selectIsLoading = (state) => state.importAccounts.isLoading
export const selectSugestionConfigurations = (state) => state.importAccounts.selectedConfiguration
export const selectParentNode = (state) => state.importAccounts.parentNode
export const selectSwitchId = (state) => state.switchId

export default importAccountsSlice.reducer