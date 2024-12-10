import ServerImport from '../../services/serverImport/server-import'
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getApiKey, getErrorAsArray } from '../utils'
import { findConfiguration } from '../copyConfigurationExtended/utils'
import { getConfigurationByKey } from './utils'
import { init } from 'i18next'

const SERVER_IMPORT_STATE_NAME = 'serverImport'
const GET_CONFIGURATIONS_ACTION = `${SERVER_IMPORT_STATE_NAME}/getConfigurations`
const SET_CONFIGURATIONS_ACTION = `${SERVER_IMPORT_STATE_NAME}/setConfigurations`

export const serverImportExtendedSlice = createSlice({
  name: SERVER_IMPORT_STATE_NAME,
  initialState: {
    currentSiteApiKey: getApiKey(window.location.hash),
    serverConfigurations: [],
    errors: [],
    isLoading: false,
    showSuccessMessage: false,
    currentSiteInformation: {},
  },
  reducers: {
    getServerConfiguration(state, action) {
      const configuration = state.serverConfigurations
      const option = getConfigurationByKey(configuration, action.payload.selectedOption)
      const initOption = option.filter((item) => item.id === action.payload.id)[0]
      initOption.value = action.payload.value
      console.log('initOptionvalue--->', JSON.stringify(initOption))
    },
  },
  extraReducers: (builder) => {
    builder.addCase(getConfigurations.pending, (state) => {
      state.isLoading = true
    })
    builder.addCase(getConfigurations.fulfilled, (state, action) => {
      state.isLoading = false
      console.log('action.payload--->', action.payload)
      state.serverConfigurations = action.payload
    })
    builder.addCase(getConfigurations.rejected, (state, action) => {
      console.log('action.payload--->', action.payload)

      state.isLoading = false
      state.errors = action.payload
    })
  },
})

export const getConfigurations = createAsyncThunk(GET_CONFIGURATIONS_ACTION, async (_, { getState, rejectWithValue }) => {
  const state = getState()
  const credentials = { userKey: state.credentials.credentials.userKey, secret: state.credentials.credentials.secretKey, gigyaConsole: state.credentials.credentials.gigyaConsole }
  const currentSiteApiKey = state.copyConfigurationExtended.currentSiteApiKey
  const currentDataCenter = state.copyConfigurationExtended.currentSiteInformation.dataCenter

  try {
    return new ServerImport(credentials, currentSiteApiKey, currentDataCenter).getStructure()
  } catch (error) {
    return rejectWithValue(getErrorAsArray(error))
  }
})
export const setDataflow = createAsyncThunk(SET_CONFIGURATIONS_ACTION, async (option, { getState, rejectWithValue }) => {
  const state = getState()
  const credentials = { userKey: state.credentials.credentials.userKey, secret: state.credentials.credentials.secretKey, gigyaConsole: state.credentials.credentials.gigyaConsole }
  const currentSiteApiKey = state.copyConfigurationExtended.currentSiteApiKey
  const currentDataCenter = state.copyConfigurationExtended.currentSiteInformation.dataCenter

  try {
    return new ServerImport(credentials, currentSiteApiKey, currentDataCenter).setDataflow(state.serverImport.serverConfigurations, option)
  } catch (error) {
    return rejectWithValue(getErrorAsArray(error))
  }
})
export const { getServerConfiguration } = serverImportExtendedSlice.actions
export const selectServerConfigurations = (state) => state.serverImport.serverConfigurations

export const serverImportExtendedSliceReducer = serverImportExtendedSlice.reducer