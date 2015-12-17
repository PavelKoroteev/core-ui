﻿/**
 * Developer: Stepan Burguchev
 * Date: 1/26/2015
 * Copyright: 2009-2016 Comindware®
 *       All Rights Reserved
 * Published under the MIT license
 */

/* global define, require, Handlebars, Backbone, Marionette, $, _, Localizer */

define(['core/libApi', 'core/services/LocalizationService'], function (lib, LocalizationService) {
    'use strict';

    Backbone.Form.validators.errMessages.letters = LocalizationService.get('CORE.FORM.VALIDATION.LETTERS');

    Backbone.Form.validators.letters = function (options) {
        options = _.extend({
            type: 'letters',
            message: Backbone.Form.validators.errMessages.letters,
            regexp: lib.XRegExp('^[\\p{L}-]+$')
        }, options);

        return Backbone.Form.validators.regexp(options);
    };
});
