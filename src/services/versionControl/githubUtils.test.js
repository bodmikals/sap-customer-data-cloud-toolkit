/*
 * Copyright: Copyright 2023 SAP SE or an SAP affiliate company and cdc-tools-chrome-extension contributors
 * License: Apache-2.0
 */
import { Base64 } from 'js-base64'
import * as githubUtils from './githubUtils'
import { removeIgnoredFields } from './dataSanitization'
import CdcService from './cdcService'

jest.mock('./dataSanitization', () => ({
  removeIgnoredFields: jest.fn(),
}))

jest.mock('./cdcService', () =>
  jest.fn().mockImplementation(() => ({
    fetchCDCConfigs: jest.fn().mockResolvedValue({
      webSdk: { key: 'value' },
      dataflow: { key: 'value' },
    }),
  })),
)

describe('githubUtils', () => {
  const octokitMock = {
    rest: {
      repos: {
        getContent: jest.fn(),
        getCommit: jest.fn(),
        listBranches: jest.fn(),
        getBranch: jest.fn(),
        listCommits: jest.fn(),
      },
      git: {
        getBlob: jest.fn(),
        createBlob: jest.fn(),
        createTree: jest.fn(),
        createCommit: jest.fn(),
        updateRef: jest.fn(),
        createRef: jest.fn(),
        getRef: jest.fn(),
      },
    },
    request: jest.fn(),
  }

  const context = {
    octokit: octokitMock,
    owner: 'testOwner',
    repo: 'testRepo',
    defaultBranch: 'main',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getFile', () => {
    it('should fetch file content', async () => {
      const mockFile = { content: 'mockContent', size: 1024 }
      octokitMock.rest.repos.getContent.mockResolvedValue({ data: mockFile })

      const result = await githubUtils.getFile(context, 'path/to/file')
      expect(result).toEqual(mockFile)
    })

    it('should fetch large file content', async () => {
      const mockFile = { content: null, size: 200 * 1024, sha: 'mockSha' }
      const mockBlobData = { content: 'mockBlobContent' }
      octokitMock.rest.repos.getContent.mockResolvedValue({ data: mockFile })
      octokitMock.rest.git.getBlob.mockResolvedValue({ data: mockBlobData })

      const result = await githubUtils.getFile(context, 'path/to/file')
      expect(result.content).toEqual('mockBlobContent')
    })
  })

  describe('getCommitFiles', () => {
    it('should fetch commit files', async () => {
      const mockCommitData = {
        files: [
          { filename: 'file1.json', contents_url: 'url1' },
          { filename: 'file2.json', contents_url: 'url2' },
        ],
      }
      const mockFileContent = Base64.encode(JSON.stringify({ key: 'value' }))
      octokitMock.rest.repos.getCommit.mockResolvedValue({ data: mockCommitData })
      octokitMock.request.mockResolvedValue({ data: { content: mockFileContent } })

      const result = await githubUtils.getCommitFiles(context, 'mockSha')
      expect(result).toEqual([
        { filename: 'file1.json', contents_url: 'url1', content: { key: 'value' } },
        { filename: 'file2.json', contents_url: 'url2', content: { key: 'value' } },
      ])
    })

    it('should throw an error if no files found in commit', async () => {
      octokitMock.rest.repos.getCommit.mockResolvedValue({ data: { files: null } })

      await expect(githubUtils.getCommitFiles(context, 'mockSha')).rejects.toThrow('No files found in commit: mockSha')
    })
  })

  describe('fetchFileContent', () => {
    it('should fetch file content from contents_url', async () => {
      const mockResponse = { content: 'mockContent' }
      octokitMock.request.mockResolvedValue({ data: mockResponse })

      const result = await githubUtils.fetchFileContent(context, 'mockUrl')
      expect(result).toEqual('mockContent')
    })

    it('should fetch blob content if response content is missing', async () => {
      const mockResponse = { sha: 'mockSha' }
      const mockBlobData = { content: 'mockBlobContent' }
      octokitMock.request.mockResolvedValue({ data: mockResponse })
      octokitMock.rest.git.getBlob.mockResolvedValue({ data: mockBlobData })

      const result = await githubUtils.fetchFileContent(context, 'mockUrl')
      expect(result).toEqual('mockBlobContent')
    })

    it('should throw an error if blob content fetch fails', async () => {
      const mockResponse = { sha: 'mockSha' }
      octokitMock.request.mockResolvedValue({ data: mockResponse })
      octokitMock.rest.git.getBlob.mockResolvedValue({ data: {} })

      await expect(githubUtils.fetchFileContent(context, 'mockUrl')).rejects.toThrow('Failed to fetch blob content for URL: mockUrl')
    })
  })

  describe('branchExists', () => {
    it('should return true if branch exists', async () => {
      const mockBranches = [{ name: 'main' }, { name: 'dev' }]
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: mockBranches })

      const result = await githubUtils.branchExists(context, 'main')
      expect(result).toBe(true)
    })

    it('should return false if branch does not exist', async () => {
      const mockBranches = [{ name: 'dev' }]
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: mockBranches })

      const result = await githubUtils.branchExists(context, 'main')
      expect(result).toBe(false)
    })

    it('should throw error if branches cannot be fetched', async () => {
      octokitMock.rest.repos.listBranches.mockRejectedValue(new Error('Network Error'))

      await expect(githubUtils.branchExists(context, 'main')).rejects.toThrow('Network Error')
    })
  })

  describe('createBranch', () => {
    it('should create a new branch if it does not exist', async () => {
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: [{ name: 'main' }] })
      octokitMock.rest.repos.getBranch.mockResolvedValue({ data: { commit: { sha: 'mockSha' } } })

      await githubUtils.createBranch(context, 'newBranch')
      expect(octokitMock.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'testOwner',
        repo: 'testRepo',
        ref: 'refs/heads/newBranch',
        sha: 'mockSha',
      })
    })

    it('should throw an error if branch name is not provided', async () => {
      await expect(githubUtils.createBranch(context)).rejects.toThrow('Branch name is required')
    })

    it('should not create a branch if it already exists', async () => {
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: [{ name: 'newBranch' }] })

      await githubUtils.createBranch(context, 'newBranch')
      expect(octokitMock.rest.git.createRef).not.toHaveBeenCalled()
    })
  })

  describe('updateFilesInSingleCommit', () => {
    it('should update files in a single commit', async () => {
      const mockRefData = { object: { sha: 'baseTreeSha' } }
      const mockBlobData = { sha: 'blobSha' }
      const mockTreeData = { sha: 'treeSha' }
      const mockCommitData = { sha: 'commitSha' }

      octokitMock.rest.git.getRef.mockResolvedValue({ data: mockRefData })
      octokitMock.rest.git.createBlob.mockResolvedValue({ data: mockBlobData })
      octokitMock.rest.git.createTree.mockResolvedValue({ data: mockTreeData })
      octokitMock.rest.git.createCommit.mockResolvedValue({ data: mockCommitData })

      const files = [{ path: 'file1.json', content: 'content1' }]
      await githubUtils.updateFilesInSingleCommit(context, 'commitMessage', files)

      expect(octokitMock.rest.git.updateRef).toHaveBeenCalledWith({
        owner: 'testOwner',
        repo: 'testRepo',
        ref: 'heads/main',
        sha: 'commitSha',
      })
    })
  })

  describe('updateGitFileContent', () => {
    it('should update git file content if there are differences', async () => {
      const mockFile = { content: Base64.encode(JSON.stringify({ key: 'value' })), sha: 'mockSha' }
      octokitMock.rest.repos.getContent.mockResolvedValue({ data: mockFile })
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: [{ name: 'main' }] })
      removeIgnoredFields.mockImplementation((obj) => obj)

      const result = await githubUtils.updateGitFileContent(context, 'path/to/file', JSON.stringify({ key: 'newValue' }))
      expect(result).toEqual({ path: 'path/to/file', content: JSON.stringify({ key: 'newValue' }), sha: 'mockSha' })
    })

    it('should return null if files are identical', async () => {
      const mockFile = { content: Base64.encode(JSON.stringify({ key: 'value' })), sha: 'mockSha' }
      octokitMock.rest.repos.getContent.mockResolvedValue({ data: mockFile })
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: [{ name: 'main' }] })
      removeIgnoredFields.mockImplementation((obj) => obj)

      const result = await githubUtils.updateGitFileContent(context, 'path/to/file', JSON.stringify({ key: 'value' }))
      expect(result).toBeNull()
    })

    it('should handle 404 error when fetching file content', async () => {
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: [{ name: 'main' }] })
      octokitMock.rest.repos.getContent.mockRejectedValue({ status: 404 })

      const result = await githubUtils.updateGitFileContent(context, 'path/to/file', JSON.stringify({ key: 'newValue' }))
      expect(result).toEqual({ path: 'path/to/file', content: JSON.stringify({ key: 'newValue' }) })
    })

    it('should handle branch does not exist error when fetching file content', async () => {
      octokitMock.rest.repos.listBranches.mockResolvedValue({ data: [] })
      octokitMock.rest.repos.getContent.mockRejectedValue(new Error('Branch does not exist'))

      const result = await githubUtils.updateGitFileContent(context, 'path/to/file', JSON.stringify({ key: 'newValue' }))
      expect(result).toEqual({ path: 'path/to/file', content: JSON.stringify({ key: 'newValue' }) })
    })
  })

  // describe('storeCdcDataInGit', () => {
  //   it('should store CDC data in git', async () => {
  //     const mockConfigs = { webSdk: { key: 'value' } }
  //     const mockFileUpdates = [{ path: 'src/versionControl/webSdk.json', content: JSON.stringify(mockConfigs.webSdk, null, 2), sha: 'mockSha' }]
  //     const cdcService = new CdcService(context)
  //     cdcService.fetchCDCConfigs.mockResolvedValue(mockConfigs)
  //     context.updateGitFileContent = jest.fn().mockResolvedValue(mockFileUpdates[0])
  //     context.updateFilesInSingleCommit = jest.fn()

  //     await githubUtils.storeCdcDataInGit(context, 'commitMessage')
  //     expect(context.updateFilesInSingleCommit).toHaveBeenCalledWith('commitMessage', mockFileUpdates)
  //   })

  //   it('should skip commit if no files to update', async () => {
  //     const cdcService = new CdcService(context)
  //     cdcService.fetchCDCConfigs.mockResolvedValue({})
  //     context.updateGitFileContent = jest.fn().mockResolvedValue(null)
  //     context.updateFilesInSingleCommit = jest.fn()

  //     await githubUtils.storeCdcDataInGit(context, 'commitMessage')
  //     expect(context.updateFilesInSingleCommit).not.toHaveBeenCalled()
  //   })
  // })

  describe('getCommits', () => {
    it('should fetch all commits', async () => {
      const mockCommits = [{ sha: 'commit1' }, { sha: 'commit2' }]
      octokitMock.rest.repos.listCommits.mockResolvedValue({ data: mockCommits })

      const result = await githubUtils.getCommits(context)
      expect(result).toEqual(mockCommits)
    })

    it('should handle errors when fetching commits', async () => {
      octokitMock.rest.repos.listCommits.mockRejectedValue(new Error('Network Error'))

      await expect(githubUtils.getCommits(context)).rejects.toThrow('Network Error')
    })
  })
})
