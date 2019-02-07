/*eslint-disable*/

import LocalizationService from '../../services/LocalizationService';

export default function(config) {
    let options = _.extend(
        {
            type: 'required',
            message: LocalizationService.get('CORE.FORM.VALIDATION.REQUIRED')
        },
        config
    );

    const required = function required(value) {
        const val = _.isObject(value) && 'value' in value ? value.value : value;
        options.value = val;

        const err = {
            type: options.type,
            message: typeof options.message === 'function' ? options.message(options) : options.message
        };
        if (val === null || val === undefined || val === '') {
            return err;
        }
        if (Array.isArray(val) && val.length === 0) {
            return err;
        }
    };

    required.name || (required.name = 'required'); //IE has no default function name.

    return required;
}
