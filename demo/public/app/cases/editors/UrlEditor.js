

import CanvasView from 'demoPage/views/CanvasView';
import DemoService from '../../DemoService';

export default function() {
    const model = new Backbone.Model({
        url: '#demo/editors/TextEditor/default'
    });

    const possibleValues = DemoService.getGroups('editors');
    /*
    [
        {
            displayName: "Multi-editor editor",
            id: "MultiEditorEditor",
            url: "#demo/editors/MultiEditorEditor/default",
        } etc.
    ]
    */
    return new CanvasView({
        view: new core.form.editors.DatalistEditor({
            model,
            collection: possibleValues,
            key: 'url',
            valueType: 'url',
            autocommit: true,
            showEditButton: true,
            showAddNewButton: true,
            showCheckboxes: false,
            maxQuantitySelected: 1
        }),
        presentation: "[ {{#each DatalistValue}}<div>{ id: '{{this.id}}', text: '{{this.text}}' }{{#unless @last}}, {{/unless}}</div>{{/each}} <div>]</div>",
        isEditor: true
    });
}
