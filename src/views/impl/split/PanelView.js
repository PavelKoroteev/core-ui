import template from './templates/panel.html';

const columnsProperty = {
    MIN_PANEL_WIDTH: 10,
    ALL_PANELS_WIDTH: 100,
    MIN_PANELS: 1,
    MAX_PANELS: 5
};

export default Marionette.View.extend({
    initialize() {
    },

    regions: {
        contentRegion: '.js-panel-container'
    },

    ui: {
        resizer: '.js-panel-resizer'
    },

    className() {
        return `panel-${this.model.collection.indexOf(this.model)}`;
    },

    template: Handlebars.compile(template),

    onRender() {
        console.log(window.panel = this);
        // this.getRegion('contentRegion').show();
        this.ui.resizer.draggable({
            axis: 'x',
            drag: (event, ui) => this.__onDrag(ui)
        });
    },

    __onDrag(ui) {
        const width = this.model.get('width');
        const widthInPx = this.$el.width();
        const percentWidthInPx = widthInPx / width;
        const offsetLeft = this.$el.offset().left;
        let newWidth = width + Math.round((ui.offset.left - offsetLeft - widthInPx) / percentWidthInPx);
        if (newWidth > columnsProperty.ALL_COLUMNS_WIDTH) {
            newWidth = columnsProperty.ALL_COLUMNS_WIDTH;
        }
        if (newWidth < columnsProperty.MIN_COLUMN_WIDTH) {
            newWidth = columnsProperty.MIN_COLUMN_WIDTH;
        }
        this.model.set('width', newWidth);
        ui.position.left = 0;
    }
});
