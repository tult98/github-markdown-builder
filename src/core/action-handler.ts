import * as core from '@actions/core'
import { context } from '@actions/github'
import {
  addCommentToPullRequest,
  updateCommentOnPullRequest
} from 'src/client/github'
import { getAllGitHubContext } from 'src/utils/github-utils'
import { readJsonFile, readTemplate } from '../utils/file-utils'
import { generateMarkdown } from '../utils/markdown-utils'

export async function runAction(): Promise<void> {
  try {
    const templatePath = core.getInput('template-file-path', {
      required: true
    })
    const jsonFilePath = core.getInput('json-file-path')
    const summary = core.getInput('summary')
    const pullRequest = core.getInput('pull-request')
    const commentId = core.getInput('comment-id')
    const refreshMessagePosition = core.getInput('refresh-message-position')

    console.log('DEBUG: refreshMessagePosition', refreshMessagePosition)
    console.log('DEBUG: refreshMessagePosition type', typeof refreshMessagePosition)

    const templateSource = readTemplate(templatePath)
    const jsonData = jsonFilePath ? readJsonFile(jsonFilePath) : {}

    const markdown = generateMarkdown(templateSource, jsonData)

    if (pullRequest && context.eventName === 'pull_request') {
      if (commentId) {
        if (isNaN(Number(commentId))) {
          throw new Error('comment-id must be a number')
        }

        await updateCommentOnPullRequest({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: Number(commentId),
          body: markdown,
          refreshMessagePosition: refreshMessagePosition === 'true',
          issueNumber: context.issue.number
        })
      } else {
        await addCommentToPullRequest(
          context.repo.owner,
          context.repo.repo,
          context.issue.number,
          markdown
        )
      }
    }

    console.log('Generated Markdown:')
    console.log(markdown)
    console.log('summary:', summary)

    if (summary) core.summary.addRaw(markdown).write()

    getAllGitHubContext()

    core.setOutput('markdown', markdown)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed with error: ${error.message}`)
    } else {
      core.setFailed('Action failed with an unknown error')
    }
  }
}
