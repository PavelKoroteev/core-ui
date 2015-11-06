/**
 * Developer: Oleg Verevkin
 * Date: 10/21/2015
 * Copyright: 2009-2014 Comindware®
 *       All Rights Reserved
 *
 * THIS IS UNPUBLISHED PROPRIETARY SOURCE CODE OF Comindware
 *       The copyright notice above does not evidence any
 *       actual or intended publication of such source code.
 */

/* global define, require, Handlebars, Backbone, Marionette, $, _ */

define(
    [
        'module/lib',
        'core/list/listApi',
        'core/utils/utilsApi',
        'text!../templates/multiSelectPanel.html',
        './MultiSelectItemView'
    ],
    function(lib, list, utils, template, MultiSelectItemView) {
        'use strict';

        return Marionette.CompositeView.extend({
            attributes: {
                tabindex: 0
            },

            className: 'multiselect-panel',

            template: Handlebars.compile(template),

            templateHelpers: function() {
                return {
                    explicitApply: this.getOption('explicitApply')
                }
            },
            
            childView: MultiSelectItemView,

            childViewOptions: function() {
                return {
                    displayAttribute: this.getOption('displayAttribute')
                };
            },

            childViewContainer: '.js-list',

            ui: {
                selectAll: '.js-select-all',
                apply: '.js-apply',
                cancel: '.js-cancel',
                close: '.js-close'
            },

            events: {
                'click @ui.selectAll': '__selectAll',
                'click @ui.apply': '__apply',
                'click @ui.cancel': '__close',
                'click @ui.close': '__close'
            },

            onShow: function() {
                this.$el.focus();
            },

            initialize: function(options) {
                utils.helpers.ensureOption(options, 'model');
                this.collection = this.model.get('collection');
            },

            __selectAll: function() {
                this.trigger('select:all');
            },

            __apply: function() {
                this.trigger('apply');
            },

            __close: function() {
                this.trigger('close');
            }
        });
    }
);
