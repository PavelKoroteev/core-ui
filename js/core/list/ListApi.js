/**
 * Developer: Stepan Burguchev
 * Date: 7/7/2014
 * Copyright: 2009-2016 Comindware®
 *       All Rights Reserved
 * Published under the MIT license
 */

/* global define, require, Marionette, _, console */

define(['./EventAggregator',
        './views/EmptyListView',
        './views/EmptyGridView',
        './views/GridColumnHeaderView',
        './views/GridHeaderView',
        './views/GridView',
        './views/ListView',
        './views/RowView',
        './views/ScrollbarView',
        './views/behaviors/ListGroupViewBehavior',
        './views/behaviors/ListItemViewBehavior',
        './views/behaviors/GridItemViewBehavior',
        './models/LoadingRowModel',
        './models/behaviors/ListGroupBehavior',
        './models/behaviors/ListItemBehavior',
        './models/behaviors/GridItemBehavior',

        './factory',
        './CellViewFactory',
        'core/libApi'
    ],
    function (EventAggregator,
              EmptyListView,
              EmptyGridView,
              GridColumnHeaderView,
              GridHeaderView,
              GridView,
              ListView,
              RowView,
              ScrollbarView,
              ListGroupViewBehavior,
              ListItemViewBehavior,
              GridItemViewBehavior,
              LoadingRowModel,
              ListGroupBehavior,
              ListItemBehavior,
              GridItemBehavior,
              factory,
              cellFactory) {
        'use strict';

        return /** @lends module:core.list */ {
            EventAggregator: EventAggregator,
            /**
             * Фабрика списков
             * @namespace
             * */
            factory: factory,
            /**
             * Фабрика ячеек
             * @namespace
             * */
            cellFactory: cellFactory,
            /**
             * Views-списка
             * @namespace
             * */
            views: {
                EmptyListView: EmptyListView,
                EmptyGridView: EmptyGridView,
                GridColumnHeaderView: GridColumnHeaderView,
                GridHeaderView: GridHeaderView,
                GridView: GridView,
                ListView: ListView,
                RowView: RowView,
                ScrollbarView: ScrollbarView,

                behaviors: {
                    ListGroupViewBehavior: ListGroupViewBehavior,
                    ListItemViewBehavior: ListItemViewBehavior,
                    GridItemViewBehavior: GridItemViewBehavior
                }
            },
            /**
             * Backbone-модели списка
             * @namespace
             * */
            models: {
                LoadingRowModel:LoadingRowModel,
                behaviors: {
                    ListGroupBehavior: ListGroupBehavior,
                    ListItemBehavior: ListItemBehavior,
                    GridItemBehavior: GridItemBehavior
                }
            }
        };
    });
