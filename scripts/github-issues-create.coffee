# Description:
#   Create issues with hubot
#
# Commands:
#   hubot issues create for {user}/{repo} #label1,label2# <title> - <content> → Create a given issue
#
# Author:
#   wireframe
githubot = require('githubot')

module.exports = (robot) ->
  handleTokenError = (res, err) ->
    switch err.type
      when 'redis'
        res.reply "Oops: #{err}"
      when 'github user'
        auth_url = "#{process.env.HEROKU_URL}/github/identity"
        res.reply "Sorry, you haven't told me your GitHub username.  Enter your Github API token at #{auth_url} and then tell me who you are\n\n> #{robot.name} I am GITHUB_USERNAME"

  parseLabels = (rawLabels) ->
    if rawLabels then rawLabels.slice(1, -2).split(",") else rawLabels
  parseMilestone = (rawMilestone) ->
    if rawMilestone then rawMilestone.slice(3, -1) else rawMilestone
  parseBody = (rawBody) ->
    if rawBody then rawBody.slice(2).trim() else rawBody

  robot.respond /issues create /i, (res) ->
    match = res.message.text.match(/issues create (for\s)?(([-_\.0-9a-z]+\/)?[-_\.0-9a-z]+) (in\s[a-z0-9]+\s)?(#[a-z0-9, ]+#\s)?([^-]+)(\s-\s.+)?/i)
    repo = githubot.qualified_repo match[2]
    payload = {body: ""}
    payload.milestone = parseMilestone match[4]
    payload.labels = parseLabels match[5]
    payload.title = match[6].trim()
    payload.body = parseBody match[7]
    console.log(payload)
    user = res.envelope.user.name

    robot.identity.findToken user, (err, token) ->
      if err
        handleTokenError(res, err)
      else
        github = githubot(robot, token: token)
        github.handleErrors (response) ->
          res.reply "Error creating issue for repo '#{repo}': #{response.statusCode} #{response.error}"
        url = "/repos/#{repo}/issues"
        github.post url, payload, (issue) ->
          res.reply "I've opened the issue ##{issue.number} for #{user} (#{issue.html_url})"
