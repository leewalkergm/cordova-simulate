// Copyright (c) Microsoft Corporation. All rights reserved.

module.exports = function (messages) {

    return {
        'InAppBrowser': {
            'open': function (success, fail, args) {
                success();
            },
            'show': function () {

            },
            'close': function () {

            },
            'injectScriptCode': function (success, fail, args) {
                success();
            },
            'injectScriptFile': function (success, fail, args) {
                success();
            },
            'injectStyleCode': function (success, fail, args) {
                success();
            },
            'injectStyleFile': function (success, fail, args) {
                success();
            }
        }
    };
};
