import ButtonView from './ButtonView';
import BlinkCheckboxPopoutPanelView from './blinkCheckbox/BlinkCheckboxPopoutPanelView';

const defaultOptions = {
    iconClass: 'eye',
    draggable: false,
    triggerBeforeOpen: false
};

export default Marionette.View.extend({
    constructor(options = {}) {
        _.defaults(options.model.attributes, defaultOptions);
        const view = this.__createView(options);

        return view;
    },

    __createView(options) {
        const view = Core.dropdown.factory.createPopout({
            buttonView: ButtonView,
            panelView: BlinkCheckboxPopoutPanelView,
            customAnchor: true,
            buttonViewOptions: {
                model: options.model
            },
            panelViewOptions: {
                model: options.model
            }
        });

        view.listenTo(view, 'panel:save:columns', () => {
            view.trigger('action:click', options.model, { type: 'panel:save:columns' });
            view.close();
        });
        if (options.model.get('triggerBeforeOpen')) {
            view.listenTo(view, 'before:open', () => {
                view.trigger('action:click', options.model, { type: 'before:open' });
            });
        }

        return view;
    }
});
