
import { Handlebars } from 'lib';
import template from '../templates/nativeGrid.hbs';
import ListView from './ListView';
import RowView from './RowView';
import TreeRowView from './TreeRowView';
import HeaderView from './HeaderView';
import ColumnHeaderView from './ColumnHeaderView';
import NoColumnsDefaultView from '../../list/views/NoColumnsView';
import dropdownFactory from '../../dropdown/factory';
import dropdownApi from 'dropdown';
import { helpers } from 'utils';

const defaultOptions = {
    headerView: HeaderView,
    rowView: RowView,
    treeRowView: TreeRowView,
    paddingLeft: 0,
    paddingRight: 0,
    isTree: false
};

/**
 * Some description for initializer
 * @name NativeGridView
 * @memberof module:core.nativeGrid.views
 * @class NativeGridView
 * @description View используемый по умолчанию для отображения строки списка
 * @extends Marionette.View
 * @param {Object} options Constructor options
 * @param {Backbone.Collection} options.collection Коллекция строк списка
 * @param {Backbone.View} [options.headerView={@link module:core.nativeGrid.views.HeaderView}] View, используемый для отображения заголовка списка
 * @param {Backbone.View} options.emptyView View для отображения пустого списка (нет строк)
 * @param {Backbone.View} [options.noColumnsView] View для отображения списка без колонок
 * @param {Object} [options.noColumnsViewOptions] Опции для noColumnsView
 * @param {Function} [options.onColumnSort] Метод, обрабатывющий событие сортировки колонок
 * @param {Number} [options.paddingLeft=0] Левый отступ
 * @param {Number} [options.paddingRight=0] Правый отступ
 * @param {Backbone.View} [options.rowView={@link module:core.nativeGrid.views.RowView}] View используемый для отображения строки списка
 * @param {Function} [options.rowViewSelector] Функция для разрешения (resolve) View, используемого для отображения строки списка.
 * Получает в качестве аргумента модель строки списка, должна вернуть необходимый класс View (например, {@link module:core.nativeGrid.views.RowView})
 * */
export default Marionette.View.extend({
    /**
     * View template
     * @param {HTML} HTML file
    * */
    template: Handlebars.compile(template),

    regions: {
        headerRegion: '.js-native-grid-header-region',
        listRegion: '.js-native-grid-list-region',
        noColumnsViewRegion: '.js-nocolumns-view-region',
        popoutRegion: '.js-popout-region'
    },

    ui: {
        headerRegion: '.js-native-grid-header-region'
    },
    /**
     * Class for view
     * @param {String} CSS class
     * */
    className: 'native-grid',

    initialize(options) {
        helpers.ensureOption(options, 'collection');
        _.defaults(this.options, defaultOptions);

        if (options.isTree) {
            this.rowView = this.options.treeRowView;
        } else {
            this.rowView = this.options.rowView;
        }
        this.rowViewSelector = this.options.rowViewSelector;
        this.collection = this.options.collection;
        this.emptyView = this.options.emptyView;
        this.emptyViewOptions = this.options.emptyViewOptions;
        options.onColumnSort && (this.onColumnSort = this.options.onColumnSort); //jshint ignore:line
        this.uniqueId = _.uniqueId('native-grid');
        this.styleSheet = document.createElement('style');
        this.initializeViews();
        this.$document = $(document);
    },

    initializeViews() {
        this.headerView = new this.options.headerView({
            columns: this.options.columns,
            gridColumnHeaderView: ColumnHeaderView,
            gridEventAggregator: this,
            isTree: this.options.isTree,
            expandOnShow: this.options.expandOnShow,
            styleSheet: this.styleSheet,
            uniqueId: this.uniqueId
        });

        if (this.options.noColumnsView) {
            this.noColumnsView = this.options.noColumnsView;
        } else {
            this.noColumnsView = NoColumnsDefaultView;
        }
        this.options.noColumnsViewOptions && (this.noColumnsViewOptions = this.options.noColumnsViewOptions); // jshint ignore:line

        const childViewOptions = Object.assign(this.options.gridViewOptions || {}, {
            columns: this.options.columns,
            gridEventAggregator: this,
            paddingLeft: this.options.paddingLeft,
            paddingRight: this.options.paddingRight,
            isTree: this.options.isTree,
            expandOnShow: this.options.expandOnShow,
            uniqueId: this.uniqueId
        });

        this.listView = new ListView({
            childView: this.rowView,
            collection: this.collection,
            childViewOptions,
            gridEventAggregator: this,
            childViewSelector: this.rowViewSelector,
            emptyView: this.emptyView,
            emptyViewOptions: this.emptyViewOptions
        });

        this.listenTo(this, 'afterColumnsResize', this.__afterColumnsResize, this);
        this.listenTo(this.headerView, 'onColumnSort', this.onColumnSort, this);
        this.listenTo(this, 'showFilterView', this.showFilterPopout, this);
        this.listenTo(this.listView, 'all', (eventName, view, eventArguments) => {
            if (eventName.startsWith('childview')) {
                this.trigger.apply(this, [eventName, view ].concat(eventArguments));
            }
        });
    },

    __onRowClick(model) {
        this.trigger('row:click', model);
    },

    __onRowDblClick(model) {
        this.trigger('row:dblclick', model);
    },

    __afterColumnsResize(width) {
        this.listView.setWidth(width);
    },

    onRender() {
        if (this.options.columns.length === 0) {
            const noColumnsView = new this.noColumnsView(this.noColumnsViewOptions);
            this.showChildView('noColumnsViewRegion', noColumnsView);
        }
        this.showChildView('headerRegion', this.headerView);
        this.showChildView('listRegion', this.listView);
        this.bindListRegionScroll();
        this.el.classList.add(this.uniqueId);
        document.body.appendChild(this.styleSheet);
    },

    bindListRegionScroll() {
        this.getRegion('listRegion').$el.scroll(event => {
            this.headerRegion.$el.scrollLeft(event.currentTarget.scrollLeft);
        });
    },

    onColumnSort(column, comparator) {
        this.collection.comparator = comparator;
        this.collection.sort();
    },

    setFitToView() {
        this.headerView.setFitToView();
        if (this.collection.length > 0) {
            this.listView.setFitToView();
        }
    },

    showFilterPopout(options) {
        const AnchoredButtonView = Marionette.View.extend({
            template: Handlebars.compile('<span class="js-anchor"></span>'),
            behaviors: {
                CustomAnchorBehavior: {
                    behaviorClass: dropdownApi.views.behaviors.CustomAnchorBehavior,
                    anchor: '.js-anchor'
                }
            },
            tagName: 'div'
        });

        const filterViewOptions = this.options.columns.find(c => c.id === options.columnHeader.options.column.id).filterViewOptions;

        this.filterDropdown = dropdownFactory.createPopout({
            buttonView: AnchoredButtonView,
            panelView: options.filterView,
            panelViewOptions: filterViewOptions,
            customAnchor: true
        });

        this.listenTo(this.filterDropdown, 'all', (eventName, eventArguments) => {
            if (eventName.startsWith('panel:')) {
                this.trigger.apply(this, [`column:filter:${eventName.slice(6)}`,
                    options.columnHeader.options.column.id, this.filterDropdown.panelView ].concat(eventArguments));
            }
        });

        this.listenTo(this.filterDropdown, 'close', (child, closeOptions) => {
            this.trigger('column:filter:close', options.columnHeader.options.column.id, child.panelView, closeOptions);
        });

        this.showChildView('popoutRegion', this.filterDropdown);
        this.filterDropdown.$el.offset(options.position);
        this.filterDropdown.open();
    }
});
