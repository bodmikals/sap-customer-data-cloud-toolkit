import Topic from '../copyConfig/communication/topic'
import ConsentStatement from '../copyConfig/consent/consentStatement'
import Schema from '../copyConfig/schema/schema'
import { exportCommunicationData } from '../exportToCsv/communicationMatches'
import { createCSVFile } from '../exportToCsv/exportToCsv'
import { exportPasswordData } from '../exportToCsv/passwordMatches'
import { exportPreferencesData } from '../exportToCsv/preferencesMatches'
import { exportSchemaData } from '../exportToCsv/schemaMatches'
import TopicImportFields from './communicationImport/communicationImport'
import { passwordImportTreeFields } from './passwordImport/passwordImport'
import PreferencesImportFields from './preferencesImport/preferencesImport'
import SchemaImportFields from './schemaImport/schemaImportFields'
import { extractAndTransformFields } from './utils'

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

  async importAccountToConfigTree() {
    const result = []
    result.push(...(await this.#schemaFields.exportTransformedSchemaData()))
    result.push(...(await this.#preferences.exportTransformedPreferencesData()))
    result.push(...(await this.#topic.exportTransformedCommunicationData()))
    result.push(...passwordImportTreeFields())
    return result
  }

  async exportDataToCsv(items) {
    let result = []
    const options = this.getOptionsFromTree(items)
    const { data, preferencesOptions, communicationsOptions, passwordOptions } = this.separateDataAndSubscriptions(items)
    const cleanSchemaData = await this.#schemaFields.exportSchemaData()
    const cleanPreferencesData = await this.#preferences.exportPreferencesData()
    const cleanTopicData = await this.#topic.exportTopicData()
    if (data) {
      result.push(...exportSchemaData(data, cleanSchemaData))
    }
    if (preferencesOptions) {
      result.push(...exportPreferencesData(preferencesOptions, cleanPreferencesData))
    }
    if (communicationsOptions) {
      result.push(...exportCommunicationData(communicationsOptions, cleanTopicData))
    }
    if (passwordOptions) {
      result.push(...exportPasswordData(passwordOptions))
    }
    console.log('result', result)
    createCSVFile(result)
  }
  separateDataAndSubscriptions(items) {
    const data = []
    const preferencesOptions = []
    const communicationsOptions = []
    const passwordOptions = []
    const schemaFields = ['data', 'subscriptions', 'internal', 'addresses', 'profile']
    const preferences = 'preferences'
    const communications = 'communications'
    const password = 'password'
    items.forEach((item) => {
      if (schemaFields.some((field) => item.id.startsWith(field))) {
        data.push(item)
      } else if (item.id.startsWith(preferences)) {
        preferencesOptions.push(item)
      } else if (item.id.startsWith(preferences)) {
        preferencesOptions.push(item)
      } else if (item.id.startsWith(communications)) {
        communicationsOptions.push(item)
      } else if (item.id.startsWith(password)) {
        passwordOptions.push(item)
      }
    })

    return { data, preferencesOptions, communicationsOptions, passwordOptions }
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
