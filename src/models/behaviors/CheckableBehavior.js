/* eslint-disable */


const CheckableBehavior = {};

CheckableBehavior.CheckableCollection = class extends Marionette.Object {
    initialize(collection) {
        this.collection = collection;
        this.checked = {};
        this.__calculateChecked();
        this.listenTo(collection, 'add remove reset update', this.__calculateChecked);
    }

    check(model) {
        if (this.internalCheck) { 
            return;
        }
        model.check();
        this.__calculateChecked();
    }

    uncheck(model) {
        if (this.internalCheck) {
            return;
        }
        model.uncheck();
        this.__calculateChecked();
    }

    checkSome(model) {
        if (!this.checked[model.cid]) { return; }

        model.checkSome();
        this.__calculateChecked();
    }

    checkAll() {
        this.internalCheck = true;
        this.each(model => {
            model.check();
        });
        this.__calculateChecked();
        this.internalCheck = false;
    }

    uncheckAll() {
        this.internalCheck = true;
        this.each(model => {
            model.uncheck();
        });
        this.__calculateChecked();
        this.internalCheck = false;
    }

    toggleCheckAll() {
        if (this.checkedLength === this.length) {
            this.uncheckAll();
        } else {
            this.checkAll();
        }
    }

    __calculateChecked() {
        if (this.internalCheck) {
            return;
        }
        this.checked = this.collection.filter(model => model.checked) || {};
    
        const checkedLength = this.checked.length || 0;
        const length = this.collection.length;
        console.log(checkedLength, length);

    
        // if (checkedLength === length) {
        //     collection.trigger('check:all', collection);
        //     return;
        // }
    
        // if (checkedLength === 0) {
        //     collection.trigger('check:none', collection);
        //     return;
        // }
    
        // if (checkedLength > 0 && checkedLength < length) {
        //     collection.trigger('check:some', collection);
        // }
    }

    updateTreeNodesCheck(model, updateParent = true) {
        if (model.children && model.children.length) {
            model.children.forEach(child => {
                if (model.checked) {
                    child.check();
                } else {
                    child.uncheck();
                }
                this.updateTreeNodesCheck(child, false);
            })
        }
        if (!updateParent) {
            return;
        }
        let parent = model.parentModel;
        while (parent && parent.children) {
            const length = parent.children.length;
            const checkedLength = parent.children.filter(child => child.checked || child.checked === null).length;
            if (checkedLength === length) {
                parent.check()
            } else if (checkedLength > 0 && checkedLength < length) {
                parent.checkSome();
            } else if (checkedLength === 0) {
                parent.uncheck();
            }
            parent = parent.parentModel;
        }
    }
}

CheckableBehavior.CheckableModel = class extends Marionette.Object {
    initialize(model) {
        this.model = model;
    }

    check() {
        if (this.checked) { return; }

        this.checked = true;
        this.trigger('checked', this);

        if (this.collection) {
            this.collection.check(this);
        }
    }

    uncheck() {
        if (this.checked === false) { return; }

        this.checked = false;
        this.trigger('unchecked', this);

        if (this.collection) {
            this.collection.uncheck(this);
        }
    }

    checkSome() {
        if (this.checked === null) { return; }

        this.checked = null;
        this.trigger('checked:some', this);
        // if (this.collection) {
        //     this.collection.checkSome(this);
        // }
    }

    toggleChecked() {
        if (this.checked) {
            this.uncheck();
        } else {
            this.check();
        }
    }
}

// const CheckableBehavior = {};

// CheckableBehavior.CheckableCollection = function (collection) {
//     this.collection = collection;
//     this.checked = {};
//     collection.on('add remove reset update', () => {
//         if (collection.internalUpdate) {
//             return;
//         }
//         this.calculateChecked && this.calculateChecked();
//         // Object.entries(this.checked).forEach(entry => {
//         //     if (!collection.get(entry[0])) {
//         //         delete this.checked[entry[0]]
//         //     }
//         // })
//     });
// };

// _.extend(CheckableBehavior.CheckableCollection.prototype, {

//     check(model) {
//         if (this.internalCheck || this.checked[model.cid]) { return; }

//         // this.checked[model.cid] = model;
//         model.check();
//         this.calculateChecked();
//     },

//     uncheck(model) {
//         if (this.internalCheck || !this.checked[model.cid]) { return; }

//         // delete this.checked[model.cid];
//         model.uncheck();
//         this.calculateChecked();
//     },

//     checkSome(model) {
//         if (!this.checked[model.cid]) { return; }

//         // delete this.checked[model.cid];
//         model.checkSome();
//         this.calculateChecked();
//     },

//     checkAll() {
//         this.internalCheck = true;
//         this.each(model => {
//             // this.checked[model.cid] = model;
//             model.check();
//         });
//         this.calculateChecked();
//         this.internalCheck = false;
//     },

//     uncheckAll() {
//         this.internalCheck = true;
//         this.each(model => {
//             // delete this.checked[model.cid];
//             model.uncheck();
//         });
//         this.calculateChecked();
//         this.internalCheck = false;
//     },

//     toggleCheckAll() {
//         if (this.checkedLength === this.length) {
//             this.uncheckAll();
//         } else {
//             this.checkAll();
//         }
//     },

//     __calculateChecked() {
//         if (this.internalCheck) {
//             return;
//         }
//         this.checked = this.filter(model => model.checked) || {};
    
//         const checkedLength = this.checked.length || 0;
//         const length = this.length;
//         console.log(checkedLength, length);
    
//         // if (checkedLength === length) {
//         //     collection.trigger('check:all', collection);
//         //     return;
//         // }
    
//         // if (checkedLength === 0) {
//         //     collection.trigger('check:none', collection);
//         //     return;
//         // }
    
//         // if (checkedLength > 0 && checkedLength < length) {
//         //     collection.trigger('check:some', collection);
//         // }
//     },

//     updateTreeNodesCheck(model, updateParent = true) {
//         if (model.children && model.children.length) {
//             model.children.forEach(child => {
//                 if (model.checked) {
//                     child.check();
//                 } else {
//                     child.uncheck();
//                 }
//                 this.updateTreeNodesCheck(child, false);
//             })
//         }
//         if (!updateParent) {
//             return;
//         }
//         let parent = model.parentModel;
//         while (parent && parent.children) {
//             const length = parent.children.length;
//             const checkedLength = parent.children.filter(child => child.checked || child.checked === null).length;
//             if (checkedLength === length) {
//                 parent.check()
//             } else if (checkedLength > 0 && checkedLength < length) {
//                 parent.checkSome();
//             } else if (checkedLength === 0) {
//                 parent.uncheck();
//             }
//             parent = parent.parentModel;
//         }
//     }
// });

// CheckableBehavior.CheckableModel = function (model) {
//     this.model = model;
// };

// _.extend(CheckableBehavior.CheckableModel.prototype, {

//     check() {
//         if (this.checked) { return; }

//         this.checked = true;
//         this.trigger('checked', this);

//         if (this.collection) {
//             this.collection.check(this);
//         }
//     },

//     uncheck() {
//         if (this.checked === false) { return; }

//         this.checked = false;
//         this.trigger('unchecked', this);

//         if (this.collection) {
//             this.collection.uncheck(this);
//         }
//     },

//     checkSome() {
//         if (this.checked === null) { return; }

//         this.checked = null;
//         this.trigger('checked:some', this);
//         // if (this.collection) {
//         //     this.collection.checkSome(this);
//         // }
//     },

//     toggleChecked() {
//         if (this.checked) {
//             this.uncheck();
//         } else {
//             this.check();
//         }
//     }
// });

export default CheckableBehavior;
export const CheckableCollection = CheckableBehavior.CheckableCollection;
export const CheckableModel = CheckableBehavior.CheckableModel;
