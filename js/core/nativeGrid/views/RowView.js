/**
 * Developer: Grigory Kuznetsov
 * Date: 22.07.2015
 * Copyright: 2009-2016 Comindware®
 *       All Rights Reserved
 * Published under the MIT license
 */

/* global define, require, Handlebars, Backbone, Marionette, $, _, Localizer */

define(['../../list/views/RowView', './behaviors/NativeGridItemViewBehavior'],
    function (RowView, NativeGridItemViewBehavior) {
        'use strict';

        /**
         * Some description for initializer
         * @name RowView
         * @memberof module:core.nativeGrid.views
         * @class RowView
         * @constructor
         * @description View используемый по умолчанию для отображения строки списка
         * @extends module:core.list.views.RowView {@link module:core.list.views.RowView}
         * @param {Object} options Constructor options
         * @param {Array} options.columns Массив колонк
         * @param {Object} options.gridEventAggregator ?
         * @param {Number} [options.paddingLeft=20] Левый отступ
         * @param {Number} [options.paddingRight=10] Правый отступ
         * */
        return RowView.extend({
            behaviors: {
                NativeGridItemViewBehavior: {
                    behaviorClass: NativeGridItemViewBehavior,
                    padding: 15
                }
            }
        });
    });
