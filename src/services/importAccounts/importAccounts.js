import ConsentStatement from '../copyConfig/consent/consentStatement'
import { exportCommunicationData } from '../exportToCsv/communicationMatches'
import { createCSVFile } from '../exportToCsv/exportToCsv'
import { exportPasswordData } from '../exportToCsv/passwordMatches'
import { exportPreferencesData } from '../exportToCsv/preferencesMatches'
import { exportSchemaData } from '../exportToCsv/schemaMatches'
import TopicImportFields from './communicationImport/communicationImport'
import { passwordImportTreeFields } from './passwordImport/passwordImport'
import PreferencesImportFields from './preferencesImport/preferencesImport'
import SchemaImportFields from './schemaImport/schemaImportFields'
import { rootOptionsValue } from './rootOptions/rootOptions'
import { getContext, getLiteRootElementsStructure, getRootElementsStructure, getUID } from './rootOptions/rootLevelFields'
class ImportAccounts {
  #credentials
  #site
  #dataCenter
  #schemaFields
  #consent
  #topic
  #preferences
  constructor(credentials, site, dataCenter) {
    this.#credentials = credentials
    this.#site = site
    this.#dataCenter = dataCenter
    this.#consent = new ConsentStatement(credentials, site, dataCenter)
    this.#schemaFields = new SchemaImportFields(credentials, site, dataCenter)
    this.#preferences = new PreferencesImportFields(credentials, site, dataCenter)
    this.#topic = new TopicImportFields(credentials, site, dataCenter)
  }

  async importAccountToConfigTree(selectedValue) {
    const result = []
    if (selectedValue === 'Full') {
      result.push(...getUID())
      result.push(...(await this.#schemaFields.exportTransformedSchemaData()))
      result.push(...(await this.#preferences.exportTransformedPreferencesData()))
      result.push(...(await this.#topic.exportTransformedCommunicationData()))
      result.push(...passwordImportTreeFields())
      result.push(...getRootElementsStructure())
    }
    if (selectedValue === 'Lite') {
      result.push(...getLiteRootElementsStructure())
      console.log('this.#schemaFields.exportLiteSchemaData()', await this.#schemaFields.exportLiteSchemaData())
      result.push(...(await this.#schemaFields.exportLiteSchemaData()))
      result.push(...(await this.#preferences.exportTransformedPreferencesData()))
      result.push(...getContext())
    }
    return result
  }

  async exportDataToCsv(items) {
    let result = []
    const { data, preferencesOptions, communicationsOptions, passwordOptions, rootOptions } = this.seperateOptionsFromTree(items)
    if (rootOptions.length > 0) {
      const rootData = rootOptionsValue(rootOptions)
      result.push(...rootData)
    }
    if (data.length > 0) {
      const schemaData = exportSchemaData(data)
      result.push(...schemaData)
    }
    if (preferencesOptions.length > 0) {
      const preferencesData = exportPreferencesData(preferencesOptions)
      result.push(...preferencesData)
    }
    if (communicationsOptions.length > 0) {
      result.push(...exportCommunicationData(communicationsOptions))
    }
    if (passwordOptions.length > 0) {
      result.push(...exportPasswordData(passwordOptions))
    }

    createCSVFile(result)
  }
  seperateOptionsFromTree(items) {
    const data = []
    const preferencesOptions = []
    const communicationsOptions = []
    const passwordOptions = []
    const rootOptions = []
    const schemaFields = ['data', 'subscriptions', 'internal', 'addresses', 'profile']
    const preferences = 'preferences'
    const communications = 'communications'
    const password = 'password'
    const rootElements = this.getRootElements()

    items.forEach((item) => {
      if (rootElements.some((root) => item.id === root && item.value === true)) {
        rootOptions.push(item)
      } else if (schemaFields.some((field) => item.id.startsWith(field) && item.value === true)) {
        data.push(item)
      } else if (item.id.startsWith(preferences) && item.value === true) {
        preferencesOptions.push(item)
      } else if (item.id.startsWith(communications) && item.value === true) {
        communicationsOptions.push(item)
      } else if (item.id.startsWith(password) && item.value === true) {
        passwordOptions.push(item)
      }
    })
    return { data, preferencesOptions, communicationsOptions, passwordOptions, rootOptions }
  }
  getRootElements() {
    return ['uid', 'dataCenter', 'phoneNumber', 'loginIds', 'isActive', 'isRegistered', 'isVerified', 'verified', 'email', 'regSource', 'registered', 'context', 'lang']
  }
  getOptionsFromTree(items) {
    let ids = []
    let switchIds = []

    items.forEach((item) => {
      if (item.value === true) {
        if (item.switchId && item.switchId.operation === 'array') {
          switchIds.push(item)
        } else {
          ids.push(item)
        }
      }
      if (item.branches && item.branches.length > 0) {
        const { ids: childIds, switchIds: childSwitchIds } = this.getOptionsFromTree(item.branches)
        ids = ids.concat(childIds)
        switchIds = switchIds.concat(childSwitchIds)
      }
    })

    return { ids, switchIds }
  }
}

export default ImportAccounts