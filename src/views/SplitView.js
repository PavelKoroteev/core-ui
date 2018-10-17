import template from './impl/split/templates/split.html';
import PanelView from './impl/split/PanelView';
import ArrayService from '../services/ArrayService';
// import SplitViewsCollection from './collections/SplitViewsCollection';

const columnsProperty = {
    MIN_PANEL_WIDTH: 10,
    ALL_PANELS_WIDTH: 100,
    MIN_PANELS: 1,
    MAX_PANELS: 5
};

export default Marionette.CompositeView.extend({
    initialize() {
        console.log(window.split = this);
        // this.collection = new SplitViewsCollection(this.options.views);
        this.collection = new Backbone.Collection(this.options.views.map(view => ({ view })));
    },

    className() {
        return `${_.uniqueId('split')} split`;
    },

    template: Handlebars.compile(template),

    childViewContainer: '.js-split-container',

    childView: PanelView,

    // childViewOptions() {
    //     return {
    //         // reqres: this.getOption('reqres'),
    //         // canvasReqres: this.getOption('canvasReqres'),
    //         // canvasAggregator: this.getOption('canvasAggregator'),
    //         // componentReqres: this.getOption('componentReqres')
    //     };
    // },

    onRender() {
        this.listenTo(this, 'add:child', this.__setDefaultWidth);
        this.listenTo(this, 'remove:child', this.__setDefaultWidth);
        this.listenToOnce(this.collection, 'change:width', this.setDefault);
        this.listenTo(this.collection, 'change:width', this.__onWidthChange);

        // this.__updateWidth();
    },

    __onWidthChange(model) {
        if (this.internalChange) {
            return;
        }
        if (model.previous('width') === model.get('width')) {
            return;
        }
        const index = this.collection.indexOf(model);

        //get array
        let arrayWidth = ArrayService.getArrayPropertiesOfCollection(this.collection, 'width');
        arrayWidth[index] = model.previous('width');

        //change array
        const leftArray = arrayWidth.slice(0, index);
        let rightArray = arrayWidth.slice(index);
        if (index === arrayWidth.length - 1) {
            arrayWidth = this.__nip(arrayWidth, index, model.get('width'));
        } else {
            rightArray = this.__nip(rightArray, (index - leftArray.length), model.get('width'));
            arrayWidth = leftArray.concat(rightArray);
        }

        arrayWidth = this.__checkArrForDeficit(arrayWidth);

        //setArray
        this.__internalChange(ArrayService.setArrayPropertiesToCollection, arrayWidth, this.collection, 'width');

        this.__updateWidth();
    },

    __setDefaultWidth() {
        const array = new Array(this.collection.length);
        array.fill(Math.floor(columnsProperty.ALL_COLUMNS_WIDTH / this.collection.length));

        this.__internalChange(ArrayService.setArrayPropertiesToCollection, array, this.collection, 'width');

        // this.__updateWidth();
    },

    setDefault() {
        this.collection.each(model => {
            const view = model.get('view');
            const width = view.$el.width();
            console.log(width);
            if (!model.has('width')) {
                model.set({ width }, { silent: true });
            }
        });
    },

    __updateWidth() {
        window.collection = this.collection;
        this.collection.each(model => {
            const view = model.get('view');
            const width = model.get('width');
            if (!width) {
                console.log('!!!!!!');
                return;
            }
            view.$el.css('width', `${model.get('width')}%`);
        });
    },

    __internalChange(func, ...arg) {
        this.internalChange = true;
        func(...arg);
        this.internalChange = false;
    },

    __nip(arr, index, newValue, minValue = columnsProperty.MIN_COLUMN_WIDTH, maxSumm = false) {
        return ArrayService.nip(arr, index, newValue, minValue, maxSumm);
    },

    __checkArrForDeficit(arr, minValue = columnsProperty.MIN_COLUMN_WIDTH, properSum = columnsProperty.ALL_COLUMNS_WIDTH) {
        return ArrayService.checkArrForDeficit(arr, minValue, properSum);
    }
});
