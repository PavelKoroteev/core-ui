import PanelModel from '../models/PanelModel';

export default Backbone.Collection.extend({
    model: PanelModel,

    comparator: false
});
