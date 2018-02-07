
import FunctionOverloadView from './FunctionOverloadView';
import FunctionOverloadModel from '../models/FunctionOverloadModel';
import FunctionParametersView from '../views/FunctionParametersView';
import template from '../templates/functionTooltip.html';

const FUNCTION_ITEM_HEIGHT = 25;
const FUNCTIONS_MAX_ROWS = 10;

export default Marionette.View.extend({
    className: 'dev-code-editor-tooltip',

    regions: {
        functionOverloadsContainer: '.js-function-overloads-container',
        functionParametersContainer: '.js-function-parameters-container'
    },

    events: {
        keydown: '__onKeydown'
    },

    template: Handlebars.compile(template),

    onRender() {
        const collection = new Backbone.Collection(this.model.get('overloads'), {
            model: FunctionOverloadModel
        });
        this.functionOverloads = new Core.list.factory.createDefaultList({
            collection: new Core.collections.VirtualCollection(collection),
            listViewOptions: {
                childView: FunctionOverloadView,
                childHeight: FUNCTION_ITEM_HEIGHT,
                height: 'auto',
                maxRows: FUNCTIONS_MAX_ROWS
            }
        }).listView;
        this.functionOverloads.on('childview:selected', child => {
            this.showChildView('functionParametersContainer', new FunctionParametersView(child.model));
        });
        this.functionOverloads.on('childview:peek', () => this.trigger('peek'));
        this.showChildView('functionOverloadsContainer', this.functionOverloads);
        if (this.options.isFull) {
            collection.at(0).select();
        }
    },

    setPosition(position) {
        this.$el.css('top', position.top);
        this.$el.css('left', position.left);
    },

    __onKeydown(e) {
        if (e.keyCode === 9 || e.keyCode === 13) {
            this.trigger('peek');
        }
    }
});
