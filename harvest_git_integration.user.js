// ==UserScript==
// @name         Harvest Gitlab Integration
// @namespace    https://artistan.org/
// @version      0.1
// @description  Harvest button integration with Git* pages
// @author       InfiniteRed
// @source       https://github.com/Artistan/harvest-scripts-integration//blob/master/harvest_git_integration.user.js
// @include      https://*git*/issue*
// @require      http://code.jquery.com/jquery-1.12.4.min.js
// @grant        none
// ==/UserScript==

jQuery.noConflict();

var IV = {};

IV.pageState = {
    currentHash: '',
    onWorkflowScreen: false,
    prototypeId: '',
    taskId: '',
    harvestIsReady: false
};

IV.selectors = {
    workflowTitle: ".workflow-screen-titlebar__screen-title",
    harvestInvisionTimer: "#harvest-invision-timer",
    assignment: ".btn:contains('Comment'),.btn:contains('Close'),.btn:contains('New'),.btn:contains('Edit')",
    harvestMessaging: "#harvest-messaging"
};

IV.setStateFromHash = function () {
    IV.pageState.currentHash = window.location.hash;
    var hashArray = window.location.hash.split('/');
    /**
    console.log(hashArray[0]); // #
    console.log(hashArray[1]); // projects
    console.log(hashArray[2]); // prototypes
    console.log(hashArray[3]); // prototype_id
    console.log(hashArray[4]); // workflow
    console.log(hashArray[5]); // undefined or screen
    console.log(hashArray[6]); // undefined or task_id
    **/
    IV.pageState.onWorkflowScreen = hashArray[5] === 'screen';
    IV.pageState.prototypeId = hashArray[3] || '';
    IV.pageState.taskId = hashArray[6] || '';
};

IV.handlePageState = function () {
   IV.setStateFromHash();
   if (IV.isOnWorkflowScreen()) {
       IV.injectPlaceholderButton();
   }
};

IV.getPlatformConfig = function () {
    var hostLink = window.location.href;
    return {
        applicationName: "GitRepository",
        permalink: hostLink
    };
};

IV.initialize = function () {
    // inject Harvest platform config script
    var harvestPlatformConfigScript = 'window._harvestPlatformConfig = ' + JSON.stringify(IV.getPlatformConfig()) + ';';
    $('<script>')
    .attr('type', 'text/javascript')
    .text(harvestPlatformConfigScript)
    .appendTo('head');

    // inject Harvest platform script
    $('<script>')
    .attr('type', 'text/javascript')
    .attr('async', true)
    .attr('src', 'https://platform.harvestapp.com/assets/platform.js')
    .appendTo('head');

   IV.handlePageState();
};

IV.isOnWorkflowScreen = function () {
    return IV.pageState.onWorkflowScreen === true;
};

IV.onHashChange = function () {
   IV.pageState.onWorkflowScreen = false;
   IV.handlePageState();
};

IV.getWorkflowTitle = function () {
    var txt = $(IV.selectors.workflowTitle).text();
    return txt.trim();
};

IV.buildTimer = function () {
   var timer = $('<div/>', {
    "id": "harvest-invision-timer",
    "class" : "harvest-timer",
    "data-item": '{"id": ' + IV.pageState.taskId + ', "name": "' + 'Git* Screen: ' + IV.getWorkflowTitle() + '"}',
    "data-account": '{"id": ' + IV.pageState.prototypeId + '}',
    "style": "float: left; margin-top: 10px; margin-right: 10px;"
   });
   $(IV.selectors.assignment).parent('div').append(timer);
   if ($(IV.selectors.harvestInvisionTimer).length) {
      try {
          var event = new CustomEvent("harvest-event:timers:add", {
              detail: { element: document.querySelector(IV.selectors.harvestInvisionTimer) }
          });
          document.querySelector(IV.selectors.harvestMessaging).dispatchEvent(event);
      }
      catch (err) {
        alert('You must be logged in to Harvest before accessing this screen: ' + err.message);
      }

   } else {
       alert('Git* Harvest Integration: DOM injection of the new timer failed');
   }
};

IV.isReadyToInjectTimer = function () {
    return $(IV.selectors.assignment).parent('div').length && IV.pageState.harvestIsReady && IV.getWorkflowTitle().length > 0 && $(IV.selectors.harvestMessaging).length;
};

IV.whenReadyForTimer = function(callback) {
    var poll;
    poll = (function(_this) {
        return function() {
            if (!IV.isReadyToInjectTimer()) {
                return;
            }
            window.clearInterval(_this.interval);
            return callback();
        };
    })(this);
    window.clearInterval(this.interval);
    this.interval = window.setInterval(poll, 200);
};

IV.injectPlaceholderButton = function () {
    IV.whenReadyForTimer(IV.buildTimer);
};

$(document).ready(function (){
    'use strict';
    IV.initialize();

    function TrackHash() {
        if (IV.pageState.currentHash !== window.location.hash) {
            IV.onHashChange();
        }
        return false;
    }
    setInterval(TrackHash, 200);

    $("body").on("harvest-event:ready", function () {
        IV.pageState.harvestIsReady = true;
    });
});
