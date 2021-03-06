//@flow
import { keyCode, helpers } from 'utils';
import GlobalEventService from '../../services/GlobalEventService';

/*
    Public interface:

    This view produce:
        trigger: positionChanged (sender, { oldPosition, position })
        trigger: viewportHeightChanged (sender, { oldViewportHeight, viewportHeight })
    This view react on:
        collection change (via Backbone.Collection events)
        position change (when we scroll with scrollbar for example): updatePosition(newPosition)
 */

const config = {
    VISIBLE_COLLECTION_RESERVE: 20,
    VISIBLE_COLLECTION_AUTOSIZE_RESERVE: 100
};

const heightOptions = {
    AUTO: 'auto',
    FIXED: 'fixed'
};

const defaultOptions = {
    height: heightOptions.FIXED,
    columnSort: true,
    maxRows: 100,
    defaultElHeight: 300,
    useSlidingWindow: true,
    childHeight: 35
};

const classes = {
    empty: 'empty'
};

/**
 * Some description for initializer
 * @name ListView
 * @memberof module:core.list.views
 * @class ListView
 * @constructor
 * @description View контента списка
 * @extends Marionette.View
 * @param {Object} options Constructor options
 * @param {Array} options.collection массив элементов списка
 * @param {Number} options.childHeight высота строки списка (childView)
 * @param {Backbone.View} options.childView view строки списка
 * @param {Backbone.View} options.childViewOptions опции для childView
 * @param {Function} options.childViewSelector ?
 * @param {Backbone.View} options.emptyView View для отображения пустого списка (нет строк)
 * @param {Object} [options.emptyViewOptions] опции для emptyView
 * @param {String} options.height задает как определяется высота строки, значения: fixed, auto
 * @param {Backbone.View} options.loadingChildView view-лоадер, показывается при подгрузке строк
 * @param {Number} options.maxRows максимальное количество отображаемых строк (используется с опцией height: auto)
 * @param {Boolean} options.useDefaultRowView использовать RowView по умолчанию. В случае, если true - обязательно
 * должны быть указаны cellView для каждой колонки.
 * */

export default Marionette.CollectionView.extend({
    initialize(options) {
        if (this.collection === undefined) {
            helpers.throwInvalidOperationError("ListView: you must specify a 'collection' option.");
        }
        this.gridEventAggregator = options.gridEventAggregator;

        options.childViewOptions && (this.childViewOptions = options.childViewOptions);
        options.emptyView && (this.emptyView = options.emptyView);
        options.emptyViewOptions && (this.emptyViewOptions = options.emptyViewOptions);
        options.childView && (this.childView = options.childView);
        options.childViewSelector && (this.childViewSelector = options.childViewSelector);
        options.loadingChildView && (this.loadingChildView = options.loadingChildView);
        this.listenTo(this.gridEventAggregator, 'toggle:collapse:all', this.__toggleCollapseAll);

        this.listenTo(this, 'childview:toggle:collapse', this.__updateCollapseAll);
        this.maxRows = options.maxRows || defaultOptions.maxRows;
        this.useSlidingWindow = options.useSlidingWindow || defaultOptions.useSlidingWindow;
        this.height = options.height;
        this.minimumVisibleRows = this.getOption('minimumVisibleRows') || 0;

        if (options.height === undefined) {
            this.height = defaultOptions.height;
        }

        this.childHeight = options.childHeight || defaultOptions.childHeight;
        this.state = {
            position: 0
        };

        if (this.collection.getState().position !== 0 && this.collection.isSliding) {
            this.collection.updatePosition(0);
        }

        this.debouncedHandleResizeLong = _.debounce(shouldUpdateScroll => this.handleResize(shouldUpdateScroll), 100);
        this.debouncedHandleResizeShort = _.debounce((...rest) => this.handleResize(...rest), 20);
        this.listenTo(GlobalEventService, 'window:resize', this.debouncedHandleResizeLong);
        this.listenTo(this.collection.parentCollection, 'add remove reset ',
            (model, collection, options) => this.debouncedHandleResizeShort(true, model, collection, options));

        this.listenTo(this.collection, 'filter', this.__handleFilter);
        this.listenTo(this.collection, 'nextModel', () => this.moveCursorBy(1));
        this.listenTo(this.collection, 'prevModel', () => this.moveCursorBy(-1));
    },

    attributes() {
        return {
            tabindex: 1
        };
    },

    events: {
        keydown: '__handleKeydown'
    },

    className() {
        return `visible-collection ${this.options.class || ''}`;
    },

    onAttach() {
        this.handleResize();
        this.listenTo(this.collection, 'update:child', model => this.__updateChildTop(this.children.findByModel(model)));
        this.$el.parent().on('scroll', this.__onScroll.bind(this));
    },

    _showEmptyView() {
        this.__updateEmpty(true);
        Marionette.CompositeView.prototype._showEmptyView.apply(this, arguments);
    },

    _destroyEmptyView() {
        this.__updateEmpty(false);
        Marionette.CompositeView.prototype._destroyEmptyView.apply(this, arguments);
    },

    __updateEmpty(isEmpty) {
        typeof this.$el.toggleClass === 'function' && this.$el.toggleClass(classes.empty, isEmpty);
    },

    _showCollection() {
        const models = this.collection.visibleModels;

        models.forEach((child, index) => {
            this._addChild(child, index);
        });
        this.children._updateLength();
    },

    // override default method to correct add twhen index === 0 in visible collection
    _onCollectionAdd(child, collection, opts) {
        let index = opts.at !== undefined && (opts.index !== undefined ? opts.index : collection.indexOf(child));

        if (this.filter || index === false) {
            index = _.indexOf(this._filteredSortedModels(index), child);
        }

        if (this._shouldAddChild(child, index)) {
            this._destroyEmptyView();
            this._addChild(child, index);
        }
    },

    childView(child) {
        if (child.get('isLoadingRowModel')) {
            return this.getOption('loadingChildView');
        }

        const childViewSelector = this.getOption('childViewSelector');
        if (childViewSelector) {
            return childViewSelector(child);
        }

        const childView = this.getOption('childView');
        if (!childView) {
            helpers.throwInvalidOperationError("ListView: you must specify either 'childView' or 'childViewSelector' option.");
        }
        return childView;
    },

    __handleKeydown(e) {
        e.stopPropagation();
        let delta;
        let handle;
        const isGrid = Boolean(this.gridEventAggregator);
        const isEditable = this.getOption('isEditable');

        handle = isGrid && isEditable ? e.target.classList.contains('cell') || e.ctrlKey : true;
        handle = handle && this.collection.isSliding;

        switch (e.keyCode) {
            case keyCode.UP:
                if (handle) {
                    this.moveCursorBy(-1, e.shiftKey);
                }
                return !handle;
            case keyCode.DOWN:
                if (handle) {
                    this.moveCursorBy(1, e.shiftKey);
                }
                return !handle;
            case keyCode.PAGE_UP:
                delta = Math.ceil(this.state.viewportHeight - 1);
                this.moveCursorBy(-delta, e.shiftKey);
                return false;
            case keyCode.PAGE_DOWN:
                delta = Math.ceil(this.state.viewportHeight - 1);
                this.moveCursorBy(delta, e.shiftKey);
                return false;
            case keyCode.SPACE:
                if (handle) {
                    const selectedModels = this.collection.selected instanceof Backbone.Model ? [this.collection.selected] : Object.values(this.collection.selected || {});
                    selectedModels.forEach(model => model.toggleChecked());
                }
                return !handle;
            case keyCode.LEFT:
                if (handle) {
                    this.collection.trigger('move:left');
                }
                return !handle;
            case keyCode.RIGHT:
                if (handle) {
                    this.collection.trigger('move:right');
                }
                return !handle;
            case keyCode.TAB:
                this.collection.trigger(e.shiftKey ? 'move:left' : 'move:right');
                return false;
            case keyCode.ENTER:
                if (handle) {
                    this.collection.trigger('enter');
                }
                this.moveCursorBy(1, false);
                return false;
            case keyCode.DELETE:
            case keyCode.BACKSPACE:
            case keyCode.ESCAPE:
                break;
            case keyCode.HOME:
                if (handle) {
                    this.__moveCursorTo(0, e.shiftKey);
                }
                return !handle;
            case keyCode.END:
                if (handle) {
                    this.__moveCursorTo(this.collection.length - 1, e.shiftKey);
                }
                return !handle;
            default:
                if (isEditable && handle) {
                    this.collection.trigger('keydown');
                }
                break;
        }
    },

    __getIndexSelectedModel() {
        const model = this.collection.get(this.collection.cursorCid);
        return this.collection.indexOf(model);
    },

    __moveCursorTo(newCursorIndex, shiftPressed) {
        const index = this.__getIndexSelectedModel();

        const nextIndex = this.__normalizeCollectionIndex(newCursorIndex);
        if (nextIndex !== index) {
            const model = this.collection.at(nextIndex);
            const selectFn = this.collection.selectSmart || this.collection.select;
            if (selectFn) {
                selectFn.call(this.collection, model, false, shiftPressed, this.getOption('selectOnCursor'));
            }
            this.scrollTo(nextIndex);
        }
    },

    // Move the cursor to a new position [cursorIndex + positionDelta] (like when user changes selected item using keyboard)
    moveCursorBy(cursorIndexDelta, shiftPressed) {
        const index = this.__getIndexSelectedModel();
        const nextIndex = this.__normalizeCollectionIndex(index + cursorIndexDelta, true);
        this.__moveCursorTo(nextIndex, shiftPressed);
    },

    scrollTo(index, shouldScrollElement = false) {
        this.__updatePositionInternal(index, shouldScrollElement);
        this.__updateTop();
    },

    __normalizePosition(position) {
        const maxPos = Math.max(0, this.collection.length - Math.max(this.minimumVisibleRows, this.state.visibleCollectionSize));
        return Math.max(0, Math.min(maxPos, position - config.VISIBLE_COLLECTION_RESERVE / 2));
    },

    // normalized the index so that it fits in range [0, this.collection.length - 1]
    __normalizeCollectionIndex(index, loop) {
        const maxIndex = this.collection.length - 1;
        const normalizeIndex = Math.max(0, Math.min(maxIndex, index));

        if (loop) {
            if (index < 0) {
                return maxIndex;
            }
            return maxIndex < index ? 0 : normalizeIndex;
        }
        return normalizeIndex;
    },

    __onScroll(e) {
        if (this.state.viewportHeight === undefined || e.target.scrollLe || this.collection.length <= this.state.viewportHeight || this.internalScroll || this.isDestroyed()) {
            return;
        }

        const newPosition = Math.max(0, Math.floor(this.$el.parent().scrollTop() / this.childHeight));
        this.__updatePositionInternal(newPosition, false);
        this.__updateTop();
    },

    __updateTop() {
        const top = Math.max(0, this.collection.indexOf(this.collection.visibleModels[0]) * this.childHeight);
        this.el.style.paddingTop = `${top}px`;

        if (this.gridEventAggregator) {
            this.gridEventAggregator.trigger('update:top', top);
        }
    },

    updatePosition(newPosition) {
        this.__updatePositionInternal(newPosition, false);
    },

    __updatePositionInternal(position, shouldScrollElement) {
        let newPosition = position;
        newPosition = this.__normalizePosition(newPosition);
        if (newPosition === this.state.position || !this.collection.isSliding) {
            return;
        }

        newPosition = this.collection.updatePosition(Math.max(0, newPosition));
        this.state.position = newPosition;
        if (shouldScrollElement) {
            this.internalScroll = true;
            const scrollTop =
                Math.max(0, newPosition > (this.collection.length - config.VISIBLE_COLLECTION_RESERVE) / 2 ? newPosition + config.VISIBLE_COLLECTION_RESERVE : newPosition) *
                this.childHeight;
            if (this.el.parentNode) {
                this.$el.parent().scrollTop(scrollTop);
            }
            _.delay(() => (this.internalScroll = false), 100);
        }

        return newPosition;
    },

    handleResize(shouldUpdateScroll, model, collection, options = {}) {
        if (!this.collection.isSliding) {
            return;
        }

        const oldViewportHeight = this.state.viewportHeight;
        const oldAllItemsHeight = this.state.allItemsHeight;

        const availableHeight =
            this.el.parentElement && this.el.parentElement.clientHeight && this.el.parentElement.clientHeight !== this.childHeight
                ? this.el.parentElement.clientHeight
                : window.innerHeight;

        if (this.children && this.children.length && !this.isEmpty()) {
            const firstChild = this.children.first().el;
            if (firstChild && firstChild.offsetHeight) {
                this.childHeight = firstChild.offsetHeight;
            }
        }

        if (this.height === heightOptions.AUTO && !_.isFinite(this.maxRows)) {
            helpers.throwInvalidOperationError("ListView configuration error: you have passed option height: AUTO into ListView control but didn't specify maxRows option.");
        }

        // Computing new elementHeight and viewportHeight
        this.state.viewportHeight = Math.max(1, Math.floor(Math.min(availableHeight, window.innerHeight) / this.childHeight));
        const visibleCollectionSize = (this.state.visibleCollectionSize = this.state.viewportHeight);
        const allItemsHeight = (this.state.allItemsHeight = this.childHeight * this.collection.length);

        if (allItemsHeight !== oldAllItemsHeight) {
            this.$el.css({ height: allItemsHeight || '' });
            if (this.gridEventAggregator) {
                this.gridEventAggregator.trigger('update:height', allItemsHeight);
            } else {
                this.trigger('update:height', allItemsHeight);
            }
        }

        if (this.state.viewportHeight === oldViewportHeight) {
            if (shouldUpdateScroll === false) {
                return;
            }
            // scroll in case of search, do not scroll in case of collapse
            if (options.add) {
                const topElement = collection.indexOf(model);
                this.scrollTo(topElement, true);
                model.trigger('blink');
            } else {
                this.scrollTo(0);
            }
            return;
        }

        this.collection.updateWindowSize(Math.max(this.minimumVisibleRows, visibleCollectionSize + config.VISIBLE_COLLECTION_RESERVE));
        this.handleResize(shouldUpdateScroll, model, collection, options);
    },

    onAddChild(view, child) {
        this.__updateChildTop(child);
    },

    __updateChildTop(child) {
        if (!child || !this.collection.length) {
            return;
        }
        requestAnimationFrame(() => {
            const childModel = child.model;
            if (this.getOption('showRowIndex')) {
                const index = childModel.collection.indexOf(childModel) + 1;
                if (index !== childModel.currentIndex) {
                    childModel.trigger('update:model', index);
                }
            }
            if (this.getOption('isTree') && typeof child.insertFirstCellHtml === 'function') {
                child.insertFirstCellHtml();
            }
        });
    },

    __toggleCollapseAll(collapsed) {
        this.__updateTreeCollapse(this.collection, collapsed);
        if (this.gridEventAggregator) {
            this.gridEventAggregator.trigger('collapse:change');
        }
        this.collection.rebuild();
        this.debouncedHandleResizeShort();
    },

    __updateTreeCollapse(collection, collapsed) {
        collection.forEach(model => {
            model.collapsed = collapsed;
            model.trigger('toggle:collapse', model);
            if (model.children && model.children.length) {
                this.__updateTreeCollapse(model.children, collapsed);
            }
        });
    },

    __getParentCollapsed(model) {
        let collapsed = false;
        let parentModel = model.parentModel;
        while (parentModel) {
            if (parentModel.collapsed !== false) {
                collapsed = true;
                break;
            }
            parentModel = parentModel.parentModel;
        }
        return collapsed;
    },

    __updateCollapseAll() {
        const collapsed = !this.collection.parentCollection.some(model => model.collapsed === false);
        if (this.gridEventAggregator) {
            this.gridEventAggregator.trigger('update:collapse:all', collapsed);
            this.gridEventAggregator.trigger('collapse:change');
        }
        this.debouncedHandleResizeShort(false);
    },

    __handleFilter() {
        this.$el.parent().scrollTop(0);
        this.scrollTo(0);
        this.debouncedHandleResizeShort();
    }
});
