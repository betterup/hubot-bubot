// Description:
//   Listener for gitx "integrate commands"
//
// Dependencies:
//
// Configuration
//   HUBOT_GITHUB_AUTH_TOKEN=your github auth token
//   HUBOT_GITHUB_ORGANIZATION=default organization for github projects
//
// Commands:
//  Hubot integrate <project> <feature-branch> - Integrate a feature branch for the referenced project into the staging aggregate branch
//  Hubot integrate <project> <feature-branch> to <aggregate-branch> - Integrate a feature branch for the referenced project into the referenced aggregate branch
//  Hubot integrate <organization>/<project> <feature-branch> into <aggregte-branch> - Integrate a feature branch for the referenced organizational project into the referenced aggregate branch
//
// Author:
//   Ryan Sonnek

var githubAuthToken = process.env.HUBOT_GITHUB_AUTH_TOKEN;
var defaultGithubOrganization = process.env.HUBOT_GITHUB_ORGANIZATION;

var child_process = require('child_process');
var fs = require('fs');
var mkdirp = require('mkdirp');
var remove = require('remove');

module.exports = function(robot) {
  function executeInProject(orgProject, cmd, callback) {
    var path = './repos/' + orgProject;
    fs.exists(path, function(exists) {
      if (exists) {
        var options = {
          cwd: path
        };
        child_process.exec(cmd, options, function(error, stdout, stderr) {
          callback.call(error);
          if (error) {
            callback(error);
            return;
          }
          callback('Operation complete');
        });
      } else {
        callback('Initializing ' + orgProject + ' repository...This may take a while...');
        mkdirp(path, function(error) {
          if (error) {
            callback(error);
            return;
          }
          var repoUrl = 'https://' + githubAuthToken + '@github.com/' + orgProject + '.git'
          child_process.exec('git clone ' + repoUrl + ' ' + path, function(error, stdout, stderr) {
            if (error) {
              remove.removeSync(path);
              callback('Error cloning repository: ' + error);
              return;
            }
            callback('Done cloning ' + orgProject + ' repository');
            executeInProject(orgProject, cmd, callback);
          });
        });
      }
    });
  }

  robot.respond(/integrate (\S+) (\S+)[ into ]?[ to ]?(\S+)?$/i, function(msg) {
    var projectWithOrganization = msg.match[1];
    var organization, project = projectWithOrganization.split('/');
    organization = organization || defaultGithubOrganization;
    var featureBranch = msg.match[2];
    var aggregateBranch = msg.match[3];

    console.log("organization: " + organization);
    console.log("project: " + project);
    console.log("feature branch: " + featureBranch);
    console.log("aggregate branch: " + aggregateBranch);

    var orgProject = organization + '/' + project;
    msg.send("Integrating " + orgProject + " " + featureBranch + (aggregateBranch ? " to " + aggregateBranch : ''));
    var command = 'git checkout master && git pull && git branch -D ' + featureBranch + ' && git checkout ' + featureBranch + ' && git integrate ' + (aggregateBranch ? aggregateBranch : '');
    executeInProject(orgProject, command, function(output) {
      msg.send(output);
    });
  });
};
