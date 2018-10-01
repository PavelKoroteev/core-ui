// @flow
import VirtualCollection from '../../collections/VirtualCollection';
import dropdown from 'dropdown';
import { helpers, comparators } from 'utils';
import template from './templates/datalistEditor.hbs';
import BaseLayoutEditorView from './base/BaseLayoutEditorView';
import FakeInputModel from './impl/datalist/models/FakeInputModel';
import ButtonView from './impl/datalist/views/ButtonView';
import PanelView from './impl/datalist/views/PanelView';
import ReferenceListItemView from './impl/datalist/views/ReferenceListItemView';
import ReferenceListWithSubtextItemView from './impl/datalist/views/ReferenceListWithSubtextItemView';
import formRepository from '../formRepository';
import DefaultReferenceModel from './impl/datalist/models/DefaultReferenceModel';
import StaticController from './impl/datalist/controllers/StaticController';

type DataValue = {
    id: string,
    name?: string
};

type DatalistValue = Array<DataValue>;

const ReferenceCollection = Backbone.Collection.extend({
    model: DefaultReferenceModel
});

const text2AscComparatorSort = helpers.comparatorFor(comparators.stringComparator2Asc, 'text');

const defaultOptions = {
    displayAttribute: 'name',
    controller: null,
    showAddNewButton: false,
    showEditButton: false,
    buttonView: ButtonView,
    showAdditionalList: false,
    subtextProperty: '',
    iconProperty: '',
    listItemView: ReferenceListItemView,
    listItemViewWithText: ReferenceListWithSubtextItemView,
    textFilterDelay: 300,
    collection: null,
    maxQuantitySelected: 1,
    allowEmptyValue: true,
    canDeleteItem: true,
    showSearch: true,
    class: undefined,
    externalBlurHandler: undefined,
    customTemplate: undefined,
    minAvailableHeight: undefined
};

/**
 * @name DatalistView
 * @member of module:core.form.editors
 * @class Editor to select object in the format <code>{ id, text }</code>, using async fetch for 'options collection'.
 * @extends module:core.form.editors.base.BaseEditorView
 * @param {Object} options Options object. All the properties of {@link module:core.form.editors.base.BaseEditorView BaseEditorView} class are also supported.
 * @param {BaseReferenceEditorController} [options.controller=null] Data provider, instance
 * {@link module:core.form.editors.reference.controllers.BaseReferenceEditorController BaseReferenceEditorController}.
 * @param {Boolean} [options.showAddNewButton=false] responsible for displaying button, which providing to user adding new elements.
 * @param {Marionette.View} [options.buttonView=ReferenceButtonView] view to display button (what we click on to show dropdown).
 * @param {Marionette.View} [options.listView=ReferenceListView] view to display item in the dropdown list.
 * @param {String} [options.displayAttribute='name'] The name of the attribute that contains display text or function return display text.
 * @param {Boolean} [options.canDeleteItem=true] Возможно ли удалять добавленные бабблы.
 * @param {Number} [options.maxQuantitySelected] Максимальное количество пользователей, которое можно выбрать.
 * @param {String} [options.valueType = 'id'] type of value (key for value or [{ id, name }] if undefined).
 * */
export default (formRepository.editors.Datalist = BaseLayoutEditorView.extend({
    initialize(options = {}) {
        _.defaults(this.options, options.schema || options, defaultOptions);
        window.view = this;

        helpers.ensureOption(options, 'collection');

        let collection = [];
        if (options.collection) {
            if (Array.isArray(options.collection)) {
                collection = options.collection;
            } else {
                collection = options.collection.toJSON();
                this.listenTo(options.collection, 'reset', collect => this.resetCollection(collect));
            }
        }
        this.panelCollection = new VirtualCollection(new ReferenceCollection(collection), {
            isSliding: true,
            selectableBehavior: options.maxQuantitySelected === 1 ? 'single' : 'multi' 
        });

        this.controller =
            this.options.controller ||
            new StaticController({
                collection: options.collection,
                displayAttribute: options.displayAttribute
            });

        this.isModelValueArray = options.maxQuantitySelected !== 1;
        this.isModelValueArrayFillObject = !options.valueType;
        // this.value is not primitive!!!this.isThisValuePrimitive = options.maxQuantitySelected === 1;
        this.valueType = options.valueType || 'id';
        this.debouncedFetchUpdateFilter = _.debounce(this.fetchUpdateFilter, this.options.textFilterDelay);
        this.listenTo(this.panelCollection, 'selected deselected', this.updateState);

        //this.value must be array with selected model from panelCollection
        this.value = this.__adjustValue(this.value);

        this.viewModel = {
            button: {
                selected: new Backbone.Collection(this.value, { // selected = this.value add fakeInputModel
                    comparator: (a, b) => {
                        if (a instanceof FakeInputModel) {
                            return 1;
                        }
                        if (b instanceof FakeInputModel) {
                            return -1;
                        }
                        return text2AscComparatorSort(a, b);
                    }
                })
            },
            panel: new Backbone.Model({
                collection: this.panelCollection
            })
        };
        this.selectedCollection = this.viewModel.button.selected;

        const reqres = Backbone.Radio.channel(_.uniqueId('datalistE'));

        this.reqres = reqres;

        reqres.reply({
            'bubble:delete': this.__onBubbleDelete.bind(this),
            'bubble:delete:last': this.__onBubbleDeleteLast.bind(this),
            'input:search': this.__onInputSearch.bind(this),
            'input:up': this.__onInputUp.bind(this),
            'input:down': this.__onInputDown.bind(this),
            'button:click': this.__onButtonClick.bind(this),
            'value:select': this.__onValueSelect.bind(this),
            'value:edit': this.__onValueEdit.bind(this),
            'add:new:item': this.__onAddNewItem.bind(this),
            'try:value:select': this.__proxyValueSelect.bind(this)
        });

        this.dropdownView = dropdown.factory.createDropdown({
            buttonView: this.options.buttonView,
            buttonViewOptions: {
                model: this.viewModel.button,
                reqres,
                getDisplayText: value => this.__getDisplayText(value, this.options.displayAttribute),
                showEditButton: this.options.showEditButton,
                customTemplate: this.options.customTemplate,
                canDeleteItem: this.options.maxQuantitySelected > 1 ? this.options.canDeleteItem : this.options.allowEmptyValue,
                createValueUrl: this.controller.createValueUrl.bind(this.controller),
                enabled: this.getEnabled(),
                readonly: this.getReadonly()
            },
            panelView: PanelView,
            panelViewOptions: {
                class: this.options.panelClass,
                model: this.viewModel.panel,
                reqres,
                showAddNewButton: this.options.showAddNewButton,
                showCheckboxes: this.options.maxQuantitySelected !== 1,
                listItemView: this.options.showAdditionalList ? this.options.listItemViewWithText : this.options.listItemView,
                getDisplayText: value => this.__getDisplayText(value, this.options.displayAttribute),
                canSelect: () => this.options.maxQuantitySelected === 1 || this.__canAddItem(),
                subTextOptions: {
                    subtextProperty: this.options.subtextProperty,
                    iconProperty: this.options.iconProperty
                },
                textFilterDelay: this.options.textFilterDelay
            },
            autoOpen: false,
            externalBlurHandler: this.options.externalBlurHandler,
            minAvailableHeight: this.options.minAvailableHeight
        });
    },

    regions: {
        dropdownRegion: {
            el: '.js-dropdown-region',
            replaceElement: true
        }
    },

    className() {
        _.defaults(this.options, this.options.schema || this.options, defaultOptions);

        const classList = [];
        const maxQuantity = this.options.maxQuantitySelected;

        if (maxQuantity === 1) {
            classList.push('editor_bubble--single');
        }
        if (this.options.showEditButton) {
            classList.push('editor_bubble--edit');
        }
        if (this.options.canDeleteItem) {
            classList.push('editor_bubble--delete');
        }

        return `${this.options.class || ''} editor editor_bubble ${classList.join(' ')}`;
    },

    template: Handlebars.compile(template),

    setValue(value): void {
        this.__value(value, false);
    },

    onRender(): void {
        this.listenTo(this.dropdownView, 'open', this.__onDropdownOpen);
        this.listenTo(this.dropdownView, 'close', this.__onDropdownClose);

        this.showChildView('dropdownRegion', this.dropdownView);

        if (this.viewModel) {
            this.__addFakeInputModel(this.viewModel.button.selected);
        }
    },

    isEmptyValue(): boolean {
        return !this.value.length;
    },

    getValue() { //getValue must return equivalent value for model.set, not use for get this.value.
        let modelValue = this.value;
        if (!this.isModelValueArrayFillObject) {
            modelValue = this.getEquivalent(this.value);
        }
        return this.isModelValueArray ? modelValue : modelValue[0];
    },

    getEquivalent(value) { //return equivalent NOT object value
        if (Array.isArray(value)) {
            return value.map(val => this.getEquivalent(val));
        }
        return value.get(this.valueType);
    },

    setReadonly(readonly: Boolean): void {
        BaseLayoutEditorView.prototype.setReadonly.call(this, readonly);
        const isEnabled = this.getEnabled() && !this.getReadonly();
        this.dropdownView.options.buttonViewOptions.enabled = isEnabled;
        this.dropdownView.button.collectionView.updateEnabled(isEnabled);
    },

    setEnabled(enabled: Boolean): void {
        BaseLayoutEditorView.prototype.setEnabled.call(this, enabled);
        const isEnabled = this.getEnabled() && !this.getReadonly();
        this.dropdownView.options.buttonViewOptions.enabled = isEnabled;
        this.dropdownView.button.collectionView.updateEnabled(isEnabled);
    },

    focus(): void {
        this.hasFocus = true;
        this.onFocus();
        this.open();
        this.__focusButton();
    },

    blur(): void {
        this.hasFocus = false;
        this.onBlur({
            triggerChange: false
        });
        this.dropdownView.close();
        this.__blurButton();
    },

    async fetchUpdateFilter(value, forceCompareText) {
        this.searchText = (value || '').trim();
        if (this.fakeInputModel.get('searchText') === this.searchText && !forceCompareText) {
            return;
        }
        this.fakeInputModel.set('searchText', this.searchText);
        return this.__fetchUpdateFilter(this.searchText);
    },

    async __fetchUpdateFilter(fetchedDataForSearchText) {
        if (this.isFetchCompleted === false) {
            return false;
        }
        this.isFetchCompleted = false;
        this.panelCollection.pointOff();

        try {
            const data = await this.controller.fetch({
                text: fetchedDataForSearchText,
                getDisplayText: editorValue => this.__getDisplayText(editorValue, this.options.displayAttribute)
            });
            this.isFetchCompleted = true;

            this.resetPanelCollection(data);

            if (this.searchText !== fetchedDataForSearchText) {
                return this.__fetchUpdateFilter(this.searchText);
            }
            this.__tryPointFirstRow();
            this.isLastFetchSuccess = true;
            this.triggerReady(); //don't move to finally, recursively.
            return true;
        } catch(e) {
            this.isFetchCompleted = true;
            this.isLastFetchSuccess = false;
            this.triggerReady();
            return false;
        }
    },

    resetSelectedCollection(models) {
        if (!this.viewModel) {
            return;
        }
        const selectedCollection = this.viewModel.button.selected;
        selectedCollection.reset(models);
        this.__addFakeInputModel(selectedCollection);
    },

    resetPanelCollection(data) {
        this.panelCollection.totalCount = data.totalCount;
        this.panelCollection.reset(data.collection);

        if (this.panelCollection.length > 0 && this.value) {
            this.value.forEach(editorValue => {
                const id = editorValue && editorValue.id !== undefined ? editorValue.id : editorValue;

                if (this.panelCollection.has(id)) {
                    this.panelCollection.get(id).select({ isSilent: true });
                }
            });
        }   
    },

    onAttach() {
        this.triggerNotReady();
        this.debouncedFetchUpdateFilter(null, true);
        if (this.options.openOnRender) {
            this.__onButtonClick();
        }
    },

    adjustPosition(isNeedToRefreshAnchorPosition) {
        if (this.dropdownView) {
            this.dropdownView.adjustPosition(isNeedToRefreshAnchorPosition);
        }
    },

    getIsOpenAllowed() {
        return this.getEnabled() && !this.getReadonly() && !this.dropdownView.isOpen;
    },

    open() {
        if (!this.getIsOpenAllowed()) {
            return;
        }
        if (this.isReady) {
            this.dropdownView.open();
        } else {
            this.listenToOnce(this, 'view:ready', this.open);
        }
    },

    close() {
        this.dropdownView.close();
    },

    __adjustValue(value: DataValue): any { //expect single value, return equivalent value from panelCollection
        if (value == null) {
            return [];
        }
        const equivalent = this.getEquivalent(Array.isArray(value) ? value[0] : value);
        const valueModel = this.panelCollection.findWhere({ [this.valueType]: equivalent });
        if (!(valueModel instanceof Backbone.Model)) {
            return [];
        }
        if (!valueModel.has(this.valueType)) {
            return [];
        }
        return [valueModel];
    },

    isValueEqual(value) {
        return Array.isArray(this.value) && this.value.some(val => this.getEquivalent(val) === this.getEquivalent(value));
    },

    __value(value: DataValue, triggerChange: boolean): void {
        if (this.isValueEqual(value)) {
            return;
        }
        const adjustedValue = this.__adjustValue(value);

        if (this.options.maxQuantitySelected === 1) {
            this.value = adjustedValue;
        } else {
            this.value = this.value.concat(adjustedValue);
        }

        console.log(this.value);
        this.resetSelectedCollection(this.value);

        if (triggerChange) {
            this.__triggerChange();
        }
    },

    updateState() {
        const selected = this.panelCollection.selected;
        const newState = Object.values(selected);
        if (this.isValueEqual(newState)) {
            return;
        }
        this.value = newState;
        this.resetSelectedCollection(this.value);
        this.__triggerChange();
    },

    resetCollection(collection) {
        const value = this.model ? this.model.get(this.key) : this.value;
        this.panelCollection.reset(collection.models);
        if (value) {
            const selectedItem = this.panelCollection.find(collectionItem => {
                const itemId = collectionItem.get('id').toString();
                if (Array.isArray(value)) {
                    return value.find(v => (v && v[this.valueType] ? v[this.valueType] : v === itemId));
                }
                return value === itemId;
            });
            if (selectedItem) {
                this.setValue(selectedItem.toJSON());
                selectedItem.select();
            }
        }
    },

    __onValueSelect(): void {
        if (this.panelCollection.lastPointedModel) {
            this.panelCollection.lastPointedModel.toggleSelected();
        }
    },

    __onValueSet(model?: Backbone.Model, options = {}): void {
        const canAddItemOldValue = this.__canAddItem();
        const value = model ? model.toJSON() : null;
        this.__value(value, true);
        this.__updateFakeInputModel();

        if (this.options.maxQuantitySelected === 1 && !options.isSilent) {
            this.dropdownView.close();
            this.__focusButton();
            return;
        }

        const stopAddItems = canAddItemOldValue !== this.__canAddItem();
        if (stopAddItems) {
            this.dropdownView.close();
        } else if (!options.isSilent) {
            this.__focusButton();
        }
    },

    __onValueUnset(model: Backbone.Model): void {
        this.dropdownView.close();
        this.__focusButton();
        this.__onBubbleDelete(model);
    },

    __canAddItem(): boolean {
        const selectedItems = this.viewModel.button.selected.models.filter(model => model !== this.fakeInputModel);
        const isAccess = this.getEnabled() && !this.getReadonly();
        const maxQuantity = this.options.maxQuantitySelected;

        return isAccess && maxQuantity > selectedItems.length;
    },

    __onValueEdit(value) {
        return this.controller.edit(value);
    },

    __onInputSearch(value): void {
        this.triggerNotReady();
        this.debouncedFetchUpdateFilter(value);
    },

    __onAddNewItem(): void {
        this.dropdownView.close();
        this.controller.addNewItem(createdValue => {
            if (createdValue) {
                this.__value(createdValue, true);
            }
        });
    },

    __getDisplayText(value, displayAttribute = this.valueType) {
        if (value == null) {
            return '';
        }
        if (typeof displayAttribute === 'function') {
            return displayAttribute(value);
        }
        return value[displayAttribute] || value[this.valueType] || `#${value[this.valueType]}`;
    },

    __focusButton(options): void {
        if (this.dropdownView.button) {
            this.dropdownView.button.focus(options);
        }
    },

    __blurButton(): void {
        if (this.dropdownView.button) {
            this.dropdownView.button.blur();
        }
    },

    __onButtonClick(): void {
        this.open();
        if (this.isReady && !this.isLastFetchSuccess) {
            this.fetchUpdateFilter(this.fakeInputModel.get('searchText'), true);
        }
    },

    __onBubbleDelete(model: Backbone.Model): Backbone.Model {
        if (!model) {
            return;
        }
        if (this.value.length === 1 && !this.options.allowEmptyValue) {
            return;
        }

        this.panelCollection.get(model.id) && this.panelCollection.get(model.id).deselect();
        // selectedModels.remove(model);

        // const selected = [].concat(this.getValue() || []);
        // const removingModelIndex = selected.findIndex(s => (s && s[this.valueType] !== undefined ? s[this.valueType] : s) === model.get(this.valueType));
        // if (removingModelIndex !== -1) {
        //     selected.splice(removingModelIndex, 1);
        // }
        // this.value = selected;
        // // this.viewModel.panel.set('value', this.value);
        // this.__triggerChange();

        // this.__updateFakeInputModel();
        // this.focus();
    },

    __updateFakeInputModel(): void {
        this.fakeInputModel && this.fakeInputModel.updateEmpty();
    },

    __addFakeInputModel(collection) {
        if (!this.options.showSearch) {
            if (this.fakeInputModel) {
                collection.remove(this.fakeInputModel);
                delete this.fakeInputModel;
            }
            return;
        }
        collection.add(
            this.isFakeInputModelWrong(collection) ? 
            this.fakeInputModel = new FakeInputModel() : 
            this.fakeInputModel
        );

        this.__updateFakeInputModel();
    },

    isFakeInputModelWrong(collection) {
        return !this.fakeInputModel || !collection.has(this.fakeInputModel.id);
    },

    updateButtonInput(string): void {
        if (this.dropdownView.button) {
            this.dropdownView.button.collectionView.updateInput(string);
        }
    },

    __onBubbleDeleteLast(): void {
        const model = this.selectedCollection.models[this.selectedCollection.length - 2];
        this.__onBubbleDelete(model);
    },

    __onInputUp(): void {
        const collection = this.panelCollection;

        if (collection.indexOf(this.panelCollection.lastPointedModel) === 0) {
            this.dropdownView.close();
            this.__focusButton({
                isShowLastSearch: true
            });
        } else {
            this.__sendPanelCommand('up');
        }
    },

    __onInputDown(): void {
        if (!this.dropdownView.isOpen) {
            this.open();
        } else {
            this.__sendPanelCommand('down');
        }
    },

    __sendPanelCommand(command: string, options: {}): void {
        if (this.dropdownView.isOpen) {
            this.dropdownView.panelView.handleCommand(command, options);
        }
    },

    triggerNotReady() {
        this.isReady = false;
        this.dropdownView.buttonView.setLoading(true);
        this.trigger('view:notReady');
        return false;
    },

    triggerReady() {
        this.isReady = true;
        this.dropdownView.buttonView.setLoading(false);
        this.trigger('view:ready');
        return true;
    },

    __tryPointFirstRow() {
        if (this.panelCollection.length) {
            this.panelCollection.selectSmart(this.panelCollection.at(0), false, false, false);
        } else {
            this.panelCollection.pointOff();
        }
    },

    __onDropdownOpen(): void {
        this.focus();
        this.__tryPointFirstRow();
        this.trigger('dropdown:open');
    },

    __onDropdownClose() {
        this.blur();
        this.panelCollection.pointOff();
        this.trigger('dropdown:close');
    },

    __proxyValueSelect() {
        if (!this.isReady) {
            this.fetchUpdateFilter(this.searchText);
        } else if (this.dropdownView.isOpen) {
            this.__onValueSelect();
        }
    }
}));
