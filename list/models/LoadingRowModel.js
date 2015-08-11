/**
 * Developer: Grigory Kuznetsov
 * Date: 27.07.2015
 * Copyright: 2009-2015 Comindware®
 *       All Rights Reserved
 *
 * THIS IS UNPUBLISHED PROPRIETARY SOURCE CODE OF Comindware
 *       The copyright notice above does not evidence any
 *       actual or intended publication of such source code.
 */

/* global define, require, Backbone, Marionette, $, _, Localizer */

define(['module/lib'],
    function (lib) {
        'use strict';
        return Backbone.Model.extend({
            initialize: function () {
            },

            defaults: {
                isLoadingRowModel: true
            }
        });
    });
