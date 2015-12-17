/**
 * Developer: Stepan Burguchev
 * Date: 9/16/2014
 * Copyright: 2009-2016 Comindware®
 *       All Rights Reserved
 * Published under the MIT license
 */

/* global define, require, Marionette, Handlebars */

define(['text!../templates/fadingPanel.html', 'core/libApi'],
    function (template) {
        'use strict';

        return Marionette.ItemView.extend({
            initialize: function () {
            },

            template: Handlebars.compile(template),

            className: 'fadingPanel',

            events: {
                'click': '__onClick'
            },

            fadeIn: function (options)
            {
                this.activeOptions = options || null;
                this.$el.addClass('fadingPanel_open');
            },

            fadeOut: function ()
            {
                this.activeOptions = null;
                this.$el.removeClass('fadingPanel_open');
            },

            __onClick: function () {
                this.trigger('click', this, this.activeOptions);
            }
        });
    });
