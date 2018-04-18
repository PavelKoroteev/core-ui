import core from 'coreApi';
import 'jasmine-jquery';

describe('Editors', () => {
    describe('MemberEditorView', () => {
        it('should initialize', function () {
            const model = new Backbone.Model({
                selected: []
            });

            const view = new core.form.editors.MembersSplitPanelEditor({
                model,
                key: 'selected',
                autocommit: true,
                users: Core.services.UserService.listUsers(),
                groups: new Backbone.Collection()
            });

            window.application.contentRegion.show(view);
            // assert
            expect(true).toBe(true);
        });
    });
});